import DeliveryCompany from 'src/@apiCore/models/deliveryCompany'
import CompanyAdress from 'src/@apiCore/models/companyAdress'
import User from 'src/@apiCore/models/user'
import DeliveryPricing from 'src/@apiCore/models/deliveryPricing'
import dbConnect from 'src/@apiCore/lib/mongodb'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import authenticate from 'src/middleware/authenticate'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

export const config = {
  api: {
    bodyParser: false
  }
}
const saltRounds = 10

export default async function devCompany(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const { method } = req
  await authenticate(req, res)
  await dbConnect()
  switch (method) {
    case 'GET':
      try {
        try {
          const { page, limit, city, country, search, shop } = req.query

          const pageNumber = parseInt(page) || 1
          const pageSize = parseInt(limit) || 10
          let queryData = {}

          if (shop) {
            const shopIds = shop.split(',').map(id => new mongoose.Types.ObjectId(id.trim()))
            queryData.shops = { $in: shopIds }
          } else {
            if (city) queryData['adress.city'] = new mongoose.Types.ObjectId(city)
            if (country) queryData['adress.country'] = new mongoose.Types.ObjectId(country)
          }
          if (search) {
            queryData.$and = [
              {
                $or: [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }]
              },
              {
                $or: [{ deletedAt: false }, { deletedAt: { $exists: false } }]
              }
            ]
          } else {
            queryData.$or = [{ deletedAt: false }, { deletedAt: { $exists: false } }]
          }

          let data = [
            { $sort: { isVerify: -1 } },
            {
              $lookup: {
                from: 'companyadresses',
                localField: 'adress',
                foreignField: '_id',
                as: 'adress'
              }
            },
            {
              $lookup: {
                from: 'deliverypricings',
                localField: 'pricings',
                foreignField: '_id',
                as: 'pricings'
              }
            },
            {
              $lookup: {
                from: 'zones', // Nom de la collection des zones
                localField: 'pricings.zone',
                foreignField: '_id',
                as: 'zones' // Joindre la zone directement dans le champ pricings
              }
            },

            {
              $match: queryData
            }
          ]

          if (req.query.page) {
            data.push({
              $facet: {
                data: [{ $skip: pageSize * (pageNumber - 1) }, { $limit: pageSize }],
                pagination: [{ $count: 'total' }]
              }
            })
          }

          const zones = await DeliveryCompany.aggregate(data)
          res.status(200).json({
            success: true,
            data: !req.query.page ? zones : zones.length > 0 ? zones[0].data : [],
            total: !req.query.page ? zones.length : zones.length > 0 ? zones[0].pagination[0]?.total || 0 : 0
          })
        } catch (error) {
          console.log(error)
          res.status(400).json({ success: false })
        }
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        const form = new formidable.IncomingForm()

        form.parse(req, async (err, fields, files) => {
          if (err) res.status(400).json({ success: false })
          if (files && files.image && files.image.name) {
            const url = await uploadFileWithFormidable('public/assets/images/', files.image)
            if (url) fields.logo = url
          }
          let adressData = null
          if (fields.address) {
            const adress = JSON.parse(fields.address)
            console.log('adress', adress)
            adressData = await CompanyAdress.insertMany(adress)
            console.log('adressData', adressData)
            if (adressData) fields.adress = adressData?.map(item => item._id)
          }
          let zonesData = null
          if (fields.zones) {
            const zones = JSON.parse(fields.zones)
            zonesData = await DeliveryPricing.insertMany(zones)
            if (zonesData) fields.pricings = zonesData?.map(item => item._id)
          }
          if (fields.type == 'partner') {
            const salt = await bcrypt.genSalt(saltRounds)
            const hashedPassword = await bcrypt.hash(fields.c_password, salt)
            const newUser = await User.create({
              password: hashedPassword,
              phone: fields.phone,
              role: 'admin-entreprise',
              image: '/images/avatars/1.png'
            })
            if (newUser) {
              fields.user = newUser._id
              fields.users = [newUser._id]
              //implement notification here
            }
          }
          if (fields.shops) fields.shops = fields.shops.split(',')

          const deliverycompany = await DeliveryCompany.create(fields)
          if (deliverycompany) {
            if (fields.user) {
              const user = await User.findOne({ _id: fields.user })
              await user.addCompany(deliverycompany._id)
            }
            res
              .status(201)
              .json({ success: true, data: { ...deliverycompany._doc, pricings: zonesData, adress: adressData } })
          } else res.status(400).json({ success: false })
        })
      } catch (error) {
        if (error.code === 11000 && error.keyPattern.email) {
          return res.status(400).json({
            message: 'Un utilisateur ayant ce numéro de téléphone existe déjà',
            ret: false,
            type: 'error_user_exist'
          })
        } else if (error.code === 11000 && error.keyPattern.phone) {
          return res.status(400).json({
            message: 'Un utilisateur ayant cet adresse mail existe déjà',
            ret: false,
            type: 'error_phone_exist'
          })
        } else {
          res.status(500).json({
            message: 'Server error',
            ret: false,
            error,
            type: 'server_error'
          })
        }
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
