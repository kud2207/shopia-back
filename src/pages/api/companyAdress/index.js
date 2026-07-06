import CompanyAdress from 'src/@apiCore/models/companyAdress'
import dbConnect from 'src/@apiCore/lib/mongodb'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import authenticate from 'src/middleware/authenticate'
import DeliveryCompany from 'src/@apiCore/models/deliveryCompany'

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
        const { page, limit, type } = req.query

        const pageNumber = parseInt(page) || 1
        const pageSize = parseInt(limit) || 5
        let queryData = {}
        if (type) queryData.type = req.query.type
        let data = [
          { $sort: { createdAt: 1 } },
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
          });
        

        const zones = await CompanyAdress.aggregate(data)
        res.status(200).json({
          success: true,
          data: !req.query.page ? zones : zones.length > 0 ? zones[0].data : [],
          total: !req.query.page ? zones.length : zones.length > 0 ? zones[0].pagination[0]?.total || 0 : 0
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

          const deliveryAdress = await CompanyAdress.create(fields)
          if (deliveryAdress) {
            if(deliveryAdress.deliveryCompany) {
              const company = await DeliveryCompany.findOne({_id: deliveryAdress.deliveryCompany})
              await company.addAdress(deliveryAdress._id)
            }
            res.status(201).json({ success: true, data: deliveryAdress })
          }
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
