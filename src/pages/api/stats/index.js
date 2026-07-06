import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import mongoose from 'mongoose'
import Order from '@models/order'
import Expense from '@models/expense'

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
        let queryData2 = {}
        let queryData3 = {}
        const isCompany = !!req.query.isCompany

        // Filtre par entreprise (si défini)
        if (req.query.company) {
          // queryData2.company = new mongoose.Types.ObjectId(req.query.company)
          queryData2.$or = [
            { company: new mongoose.Types.ObjectId(req.query.company) },
            { driver: new mongoose.Types.ObjectId(req.query.company) }
          ]
          queryData3.company = new mongoose.Types.ObjectId(req.query.company)
        }
        if (req.query.shop) {
          queryData2.shop = new mongoose.Types.ObjectId(req.query.shop)
          queryData3.shop = new mongoose.Types.ObjectId(req.query.shop)
        }

        if (req.query.driver) {
          queryData2.driver = new mongoose.Types.ObjectId(req.query.driver)
        }

        // Filtre par date (si défini)
        if (req.query.date) {
          const date = new Date(req.query.date)
          const startOfDay = new Date(date.setUTCHours(0, 0, 0, 0))
          const endOfDay = new Date(date.setUTCHours(23, 59, 59, 999))

          queryData2.$or = [
            {
              date: { $gte: startOfDay, $lte: endOfDay }
            },
            {
              date: { $exists: false },
              createdAt: { $gte: startOfDay, $lte: endOfDay }
            }
          ]

          queryData3.date = { $gte: startOfDay, $lte: endOfDay }
        }

        // Filtre par plage de dates
        if (req.query.startDate && req.query.endDate) {
          const startOfDay = new Date(new Date(req.query.startDate).setUTCHours(0, 0, 0, 0))
          const endOfDay = new Date(new Date(req.query.endDate).setUTCHours(23, 59, 59, 999))

          queryData2.$and = [
            {
              $or: [
                {
                  date: { $gte: startOfDay, $lte: endOfDay }
                },
                {
                  deliveryDate: { $gte: startOfDay, $lte: endOfDay }
                }
              ]
            }
          ]
          queryData3.date = { $gte: startOfDay, $lte: endOfDay }
        }

        // Filtre sur les statuts à prendre en compte pour le comptage
        const statusFilter = ['En cours', 'En attente', 'Livré', 'Non livré']
        queryData2.status = { $in: statusFilter }

        const day1 = await Order.aggregate([
          { $sort: { createdAt: 1 } },
          {
            $lookup: {
              from: 'stocks',
              localField: 'stock',
              foreignField: '_id',
              as: 'stock'
            }
          },
          { $match: queryData2 },

          {
            $facet: {
              data: [
                {
                  $project: {
                    jour: { $dateToString: { format: '%Y-%m-%d', date: '$deliveryDate' } },
                    stockVendu: '$quantity',
                    product: '$stock',
                    amount: '$total',
                    deliveryAmount: '$deliveryCost',
                    isPrepaid:'$isPrepaid',
                    isCustomerPaidDelivery: '$isCustomerPaidDelivery',
                    status: 1
                  }
                },
                {
                  $group: {
                    _id: '$jour',
                    // Calculs uniquement pour "Livré" ou statut inexistant
                    stockVendu: {
                      $sum: {
                        $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$stockVendu', 0]
                      }
                    },
                    nombreLivraison: {
                      $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, 1, 0] }
                    },
                    // amounts: {
                    //   $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$amount', 0] }
                    // },
                    amounts: {
                      $sum: {
                        $cond: [
                          { $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] },
                          isCompany
                            ? {
                                $cond: [
                                  { $and: ['$isPrepaid', '$isCustomerPaidDelivery'] },
                                  '$deliveryAmount',
                                  {
                                    $cond: [
                                      '$isPrepaid',
                                      0,
                                      {
                                        $cond: [
                                          '$isCustomerPaidDelivery',
                                          { $add: ['$amount', '$deliveryAmount'] },
                                          '$amount'
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            : '$amount',
                          0
                        ]
                      }
                    },
                    devAmount: {
                      $sum: {
                        $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$deliveryAmount', 0]
                      }
                    }
                  }
                }
              ],
              dataAll: [
                {
                  $group: {
                    _id: null,
                    // Calculs uniquement pour "Livré" ou statut inexistant
                    stockVendu: {
                      $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$quantity', 0] }
                    },
                    nombreLivraison: {
                      $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, 1, 0] }
                    },
                    // amounts: {
                    //   $sum: { $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$total', 0] }
                    // },
                     amounts: {
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
                                        $cond: [
                                          '$isCustomerPaidDelivery',
                                          { $add: ['$total', '$deliveryCost'] },
                                          '$total'
                                        ]
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
                    devAmount: {
                      $sum: {
                        $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$deliveryCost', 0]
                      }
                    },
                    shipAmount: {
                      $sum: {
                        $cond: [{ $or: [{ $eq: ['$status', 'Livré'] }, { $not: ['$status'] }] }, '$shippingCost', 0]
                      }
                    },
                    // Comptage global par statut (toutes les commandes)
                    nombreCommandes: { $sum: 1 },
                    nombreEnCours: { $sum: { $cond: [{ $eq: ['$status', 'En cours'] }, 1, 0] } },
                    nombreEnAttente: { $sum: { $cond: [{ $eq: ['$status', 'En attente'] }, 1, 0] } },
                    nombreLivre: { $sum: { $cond: [{ $eq: ['$status', 'Livré'] }, 1, 0] } },
                    nombreNonLivre: { $sum: { $cond: [{ $eq: ['$status', 'Non livré'] }, 1, 0] } }
                  }
                }
              ],
              products: [
                {
                  $group: {
                    _id: '$stock.product'
                  }
                }
              ]
            }
          }
        ])

        const day2 = await Expense.aggregate([
          { $sort: { createdAt: 1 } },
          { $match: queryData3 },
          {
            $facet: {
              dataAll: [
                {
                  $group: {
                    _id: null,
                    // Calculs uniquement pour "Livré" ou statut inexistant
                    amounts: {
                      $sum: '$amount'
                    },
                    shopExpense: {
                      $sum: {
                        $cond: [
                          { $and: [{ $ifNull: ['$shop', false] }, { $ifNull: ['$company', false] }] },
                          '$amount',
                          0
                        ]
                      }
                    },
                    companyExpense: {
                      $sum: {
                        $cond: [{ $and: [{ $not: ['$shop'] }, { $ifNull: ['$company', false] }] }, '$amount', 0]
                      }
                    }
                  }
                }
              ]
            }
          }
        ])

        // const orders = await Delivery.countDocuments(queryData1);
        const data = day1.length > 0 ? day1[0] : null
        res.status(200).json({
          success: true,
          // data: day.length > 0 ? day[0] : null,
          data: data,
          orders: data?.dataAll.length ? data?.dataAll[0].nombreLivraison : 0,
          expense: day2.length > 0 ? day2[0] : null
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
