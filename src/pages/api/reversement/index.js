import Reversement from 'src/@apiCore/models/reversement'
import Order from 'src/@apiCore/models/order'
import Expense from 'src/@apiCore/models/expense'
import dbConnect from 'src/@apiCore/lib/mongodb'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import authenticate from 'src/middleware/authenticate'
import mongoose from 'mongoose'
import moment from 'moment'

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
        const { page, limit } = req.query

        const pageNumber = parseInt(page) || 1
        const pageSize = parseInt(limit) || 5
        let queryData = {}

        if (req.query.shop) {
          queryData.shop = new mongoose.Types.ObjectId(req.query.shop)
        }
        if (req.query.company) {
          queryData.company = new mongoose.Types.ObjectId(req.query.company)
        }

        if (req.query.user) {
          queryData.user = new mongoose.Types.ObjectId(req.query.user)
        }

        // Filtre par plage de dates
        if (req.query.startDate && req.query.endDate) {
          const startOfDay = new Date(new Date(req.query.startDate).setUTCHours(0, 0, 0, 0))
          const endOfDay = new Date(new Date(req.query.endDate).setUTCHours(23, 59, 59, 999))
          queryData.date = { $gte: startOfDay, $lte: endOfDay }
        }
        if (req.query.date) {
          const startOfDay = new Date(new Date(req.query.date).setUTCHours(0, 0, 0, 0))
          queryData.date = startOfDay
        }
        queryData.$or = [{ isDelete: false }, { isDelete: { $exists: false } }]

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
          })

        const zones = await Reversement.aggregate(data)
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
          if (files && files.image && files.image.name) {
            const url = await uploadFileWithFormidable(files.image, 'public/assets/images/')
            if (url) fields.image = url
          }
          if (fields.startDate) {
            const data = await getOrderData(fields.company, fields.shop, fields.startDate, fields.date)
            const reversement = await Reversement.insertMany(data)
            if (reversement) res.status(201).json({ success: true, data: reversement })
          } else {
            const reversement = await Reversement.create(fields)
            if (reversement) res.status(201).json({ success: true, data: reversement })
            res.status(400).json({ success: false })
          }
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

async function getOrderData(company, shop, startDate, endDate) {
  let queryData = { status: 'Livré' }
  let queryData1 = {}

  // Filtre par livreur (si défini)
  if (company) {
    // queryData.company = new mongoose.Types.ObjectId(req.query.company)
    queryData.$or = [
      { company: new mongoose.Types.ObjectId(company) },
      { driver: new mongoose.Types.ObjectId(company) }
    ]
    queryData1.company = new mongoose.Types.ObjectId(company)
  }

  if (shop) {
    queryData.shop = new mongoose.Types.ObjectId(shop)
    queryData1.shop = new mongoose.Types.ObjectId(shop)
  }

  if (startDate && endDate) {
    const startOfDay = new Date(new Date(startDate).setUTCHours(0, 0, 0, 0))
    const endOfDay = new Date(new Date(endDate).setUTCHours(23, 59, 59, 999))
    queryData.$and = [
      {
        $or: [
          {
            comptabilityDate: {
              $gte: startOfDay,
              $lt: endOfDay
            }
          },
          {
            date: {
              $gte: startOfDay,
              $lt: endOfDay
            }
          },
          {
            deliveryDate: {
              $gte: startOfDay,
              $lt: endOfDay
            }
          }
        ]
      }
    ]
    queryData1.date = { $gte: startOfDay, $lte: endOfDay }
  }

  queryData1.$or = [{ isDelete: false }, { isDelete: { $exists: false } }]
  let data = [
    { $sort: { createdAt: 1 } },
    {
      $match: {
        $and: [queryData1]
      }
    },
    {
      $group: {
        _id: '$date', // ou grouper par jour/livreur selon les besoins
        totalExpenses: {
          $sum: '$amount'
        }
      }
    }
  ]

  const expenses = await Expense.aggregate(data)
  const reversements = await Reversement.aggregate(data)
  const orders = await Order.aggregate([
    { $sort: { createdAt: 1 } },
    {
      $match: queryData // Autres conditions comme la date ou le livreur
    },
    {
      $group: {
        _id: '$date', // ou grouper par jour/livreur selon les besoins
        sales: {
          $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$quantity', 0] }
        },
        totalDeliveries: {
          $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, 1, 0] }
        },
        // totalOrderAmount: {
        //   $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$total', 0] }
        // },
        totalOrderAmount: {
          $sum: {
            $cond: [
              { $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] },
              {
                $cond: [
                  { $and: ['$isPrepaid', '$isCustomerPaidDelivery'] },
                  '$deliveryCost',
                  {
                    $cond: [
                      '$isPrepaid',
                      0,
                      {
                        $cond: ['$isCustomerPaidDelivery', { $add: ['$total', '$deliveryCost'] }, '$total']
                      }
                    ]
                  }
                ]
              },
              0
            ]
          }
        },
        totalDeliveryAmount: {
          $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$deliveryCost', 0] }
        },
        totalShippingAmount: {
          $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$shippingCost', 0] }
        }
      }
    }
  ])
  const newReversements = []
  const dates = getDatesBetween(startDate, endDate)
  for (let date of dates) {
    const item = orders.find(v => moment(v._id).isSame(moment(date)))
    const lastRev = reversements.find(v => moment(v._id).isSame(moment(date)))
    const exp = expenses.find(v => moment(v._id).isSame(moment(date)))
    const amounts =
      (item?.totalOrderAmount || 0) -
      (item?.totalDeliveryAmount || 0) -
      (item?.totalShippingAmount || 0) -
      (exp?.totalExpenses || 0)

    if (!lastRev && amounts != 0) {
      newReversements.push({
        shop,
        company,
        date: date,
        amount: amounts
      })
    }
  }
  return newReversements
}

function getDatesBetween(startDate, endDate) {
  const result = []
  let current = new Date(startDate)

  const end = new Date(endDate)

  while (current <= end) {
    // On force l'heure à 00:00 UTC
    const utcDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()))
    result.push(utcDate.toISOString())

    // Incrémenter d'un jour
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return result
}
