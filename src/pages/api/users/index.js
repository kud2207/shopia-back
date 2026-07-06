import User from 'src/@apiCore/models/user'
import dbConnect from 'src/@apiCore/lib/mongodb'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import bcrypt from 'bcrypt'
import authenticate from 'src/middleware/authenticate'
const mongoose = require('mongoose') // Assurez-vous que mongoose est importé

export const config = {
  api: {
    bodyParser: false
  }
}
export default async function register(req, res) {
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
        const { page, limit, shop, q, company, referrerCode} = req.query

        let queryData = req.query.type ? { role: { $in: req.query.type.split(',') } } : {}
        const pageNumber = parseInt(page) || 1
        const pageSize = parseInt(limit) || 5
        if (shop) {
          const shopIds = shop.split(',').map(id => new mongoose.Types.ObjectId(id.trim()))
          queryData.shops = {
            $elemMatch: {
              _id: { $in: shopIds }
            }
          }
        }
          if (referrerCode) {
          queryData.referrerCode = referrerCode
        }

        if (company) {
          const companyIds = company.split(',').map(id => new mongoose.Types.ObjectId(id.trim()))
          queryData.deliveryCompanies = { $in: companyIds }
        }
        if (((req.query.type == 'livreur') && !company && shop) ) {
          queryData.isShopUser = true
        }else if (!req.query.type && !company && shop) {
          queryData.$or = [
            { role: { $ne: 'livreur' } },
            {
              $and: [
                { role: 'livreur' },
                { isShopUser: true }
              ]
            }
          ]
        }
        if (q) {
          queryData.$or = [{ name: { $regex: q } }, { email: { $regex: q } }, { phone: { $regex: q } }]
        }
        let data = [
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: 'shops',
              localField: 'shops',
              foreignField: '_id',
              as: 'shops'
            }
          },
          {
            $match: {
              $and: [queryData]
            }
          }
        ]
        if (req.query.page)
          data.push({
            $facet: {
              data: [{ $skip: pageSize * (pageNumber - 1) }, { $limit: pageSize }],
              pagination: [{ $count: 'total' }]
            }
          })
        const users = await User.aggregate(data)
        res.status(200).json({
          success: true,
          data: !req.query.page ? users : users.length > 0 ? users[0].data : [],
          total: !req.query.page ? users.length : users.length > 0 ? users[0].pagination[0]?.total || 0 : 0
        })
      } catch (error) {
        console.log('error', error)
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
            if (url) fields.image = url
          }
          if (fields.pass) fields.password = await bcrypt.hash(fields.pass, 10)
          if (fields.shops) fields.shops = fields.shops?.split(',')
          if (fields.zones) fields.zones = fields.zones?.split(',')
          if (fields.company) fields.deliveryCompanies = [fields.company]
          fields.location = {
            type: 'Point',
            coordinates: [0, 0]
          }
          fields.isNewUser = true;

          const user = await User.create(fields).catch(error => {
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
          })
          if (user) {
            res.status(201).json({ success: true, data: user })
          } else res.status(400).json({ success: false })
        })
      } catch (error) {
        console.log('errorde', error)
        if (error.code === 11000 && error.keyPattern.email) {
          return res.status(400).json({
            message: 'Un utilisateur ayant ce numéro de téléphone existe déjà',
            ret: false,
            type: 'error_email_exist'
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
