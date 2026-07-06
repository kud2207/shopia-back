import Notification from 'src/@apiCore/models/notifications'
import dbConnect from 'src/@apiCore/lib/mongodb'
import formidable from 'formidable-serverless'
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
        const { page, limit, shop, company } = req.query

        let queryData = {}
        const pageNumber = parseInt(page) || 1
        const pageSize = parseInt(limit) || 100
        if (shop) {
          queryData.shop = new mongoose.Types.ObjectId(shop.trim())
        } else if (company) {
          console.log(company)
          // queryData.company = new mongoose.Types.ObjectId(company.trim())
          queryData.$or = [
            {
              company: new mongoose.Types.ObjectId(company.trim())
            },
            { toChanel: new mongoose.Types.ObjectId(company.trim()) }
          ]
        }

        let data = [
          { $sort: { createdAt: -1 } },
          {
            $match: queryData
          }
        ]
          data.push({
            $facet: {
              data: [{ $skip: pageSize * (pageNumber - 1) }, { $limit: pageSize }],
              pagination: [{ $count: 'total' }]
            }
          })
        const users = await Notification.aggregate(data)
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

          const notification = await Notification.create(fields).catch(error => {
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
          res.status(201).json({ success: true, data: notification })
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
