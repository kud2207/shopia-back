import Stock from 'src/@apiCore/models/stock'
import Product from 'src/@apiCore/models/product'

import dbConnect from 'src/@apiCore/lib/mongodb'
import formidable from 'formidable-serverless'
import authenticate from 'src/middleware/authenticate'
import mongoose from 'mongoose'
import { handleCreateNotif } from 'src/@apiCore/npoints'
import { sendPushNotificationToUser, uploadFileWithFormidable } from 'src/@apiCore/helpers'

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
        let queryData = {}
        let data = []
        if (req.query.date && req.query.livreur) {
          const livreurs = req.query.livreur?.split(',')?.map(l => new mongoose.Types.ObjectId(l))
          queryData = {
            jour: new Date(req.query.date),
            $and: [
              {
                $or: [{ livreur: { $in: livreurs } }, { driver: { $in: livreurs } }]
              },
              {
                $or: [{ isDelete: { $exists: false } }, { isDelete: false }]
              },
              {
                $or: [{ 'product.isDelete': { $exists: false } }, { 'product.isDelete': false }]
              }
            ]
          }

          if (req.query.shop) queryData.shop = new mongoose.Types.ObjectId(req.query.shop)
          data = [
            { $sort: { createdAt: 1 } },
            {
              $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'product'
              }
            },
            {
              $unwind: {
                path: '$product',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'deliveries',
                localField: 'delivery',
                foreignField: '_id',
                as: 'delivery'
              }
            },
            {
              $match: queryData
            }
          ]
        }
        if (req.query.product) {
          // queryData = {
          //   jour: new Date(req.query.date),
          //   product: new mongoose.Types.ObjectId(req.query.product),
          // }
          data = [
            { $match: { product: new mongoose.Types.ObjectId(req.query.product) } },
            {
              $sort: {
                livreur: 1,
                createdAt: -1
              }
            },
            {
              $group: {
                _id: '$livreur',
                latestEntry: { $first: '$$ROOT' }
              }
            },
            {
              $replaceRoot: {
                newRoot: '$latestEntry'
              }
            },
            {
              $lookup: {
                from: 'deliverycompanies', // Remplacez par le nom de votre collection de livreurs
                localField: 'livreur',
                foreignField: '_id',
                as: 'livreur'
              }
            },
            {
              $unwind: '$livreur'
            }
          ]
        }
        const products = await Stock.aggregate(data)
        res.status(200).json({
          success: true,
          data: products
        })
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
          if (fields.productName) {
            const filesArr = []
            if (files) {
              for (const key in files) {
                if (files.hasOwnProperty(key)) {
                  const url = await uploadFileWithFormidable('public/images/products', files[key])
                  filesArr.push(url)
                }
              }
            }
            const pro = await Product.create({
              name: fields.productName,
              price: fields.price,
              quantity: fields.stockDisponible,
              quantityDispacth: fields.stockDisponible,
              shop: fields.shop,
              images: filesArr
            })
            if (pro) fields.product = pro._id
          }
          const stock = await Stock.create(fields)

          if (!fields.productName && fields.name && fields.shopName && fields.livreur && stock) {
            const val = `${fields.shopName} vous à ajouter ${stock.stockDisponible} ${fields.name}`
            handleCreateNotif({
              title: 'Nouveau stock',
              company: fields.livreur,
              content: val,
              redirectionLink: '',
              read: false
            })
            sendPushNotificationToUser('Nouveau stock', val, '', fields.livreur)
          }
          if (stock) res.status(201).json({ success: true, data: stock })
          else res.status(400).json({ success: false })
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
