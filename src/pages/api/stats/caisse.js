import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import mongoose from 'mongoose'
import Order from '@models/order'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  // Preflight CORS handler
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
        let queryData = { status: 'Livré' }
        const isCompany = !!req.query.isCompany

        // Filtre par livreur (si défini)
        if (req.query.company) {
          // queryData.company = new mongoose.Types.ObjectId(req.query.company)
          queryData.$or = [
            { company: new mongoose.Types.ObjectId(req.query.company) },
            { driver: new mongoose.Types.ObjectId(req.query.company) }
          ]
        }

        if (req.query.shop) {
          queryData.shop = new mongoose.Types.ObjectId(req.query.shop)
        }

        if (req.query.driver) {
          if (req.query.isDriver) {
            queryData.$or = [{ driver: { $exists: false } }, { driver: new mongoose.Types.ObjectId(req.query.driver) }]
          } else {
            queryData.$or = [
              { createdBy: new mongoose.Types.ObjectId(req.query.driver) },
              { driver: new mongoose.Types.ObjectId(req.query.driver) }
            ]
          }
        }

        if (req.query.date) {
          const date = new Date(req.query.date)
          const date_debut = new Date(req.query.date_debut)
          const startDateDay = new Date(date_debut?.setUTCHours(0, 0, 0, 0))

          const startOfDay = new Date(date.setUTCHours(0, 0, 0, 0))
          const endOfDay = new Date(date.setUTCHours(23, 59, 59, 999))
          queryData.$and = [
            {
              $or: [
                {
                  comptabilityDate: {
                    $gte: req.query.date_debut ? startDateDay : startOfDay,
                    $lt: endOfDay
                  }
                },
                {
                  date: {
                    $gte: req.query.date_debut ? startDateDay : startOfDay,
                    $lt: endOfDay
                  }
                },
                {
                  deliveryDate: {
                    $gte: req.query.date_debut ? startDateDay : startOfDay,
                    $lt: endOfDay
                  }
                }
              ]
            }
          ]
        }

        const day = await Order.aggregate([
          { $sort: { createdAt: 1 } },
          {
            $match: queryData // Autres conditions comme la date ou le livreur
          },
          {
            $group: {
              _id: null, // ou grouper par jour/livreur selon les besoins
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
                    isCompany
                      ? {
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
                        }
                      : '$total',
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
        res.status(200).json({
          success: true,
          data: day.length > 0 ? day[0] : null
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    default:
      res.status(400).json({ success: false })
      break
  }
}
