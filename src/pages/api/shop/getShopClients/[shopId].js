import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import mongoose from 'mongoose'

export default async function getShopClients(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')

  // Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }

  try {
    await dbConnect()

    const { page = 1, limit = 10, shopId, search } = req.query

    // Validation et conversion des paramètres
    const pageNumber = parseInt(page)
    const pageSize = parseInt(limit)
    let queryData = {}

    if (shopId && mongoose.Types.ObjectId.isValid(shopId)) {
      queryData.shop = new mongoose.Types.ObjectId(shopId)
    }

    if (search) {
      queryData.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ]
    }

    // Construction du pipeline d'agrégation
    const matchStage = Object.keys(queryData).length > 0 ? [{ $match: queryData }] : []

    const values = await Order.aggregate([
      { $sort: { updatedAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      ...matchStage,
      {
        $group: {
          _id: '$customer._id',
          customer: { $first: '$customer' },
          count: { $sum: 1 },
          livre: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$status', 'Livré'] }, { $eq: ['$status', 'processing'] }, { $not: ['$status'] }] },
                1,
                0
              ]
            }
          },
          enAttente: { $sum: { $cond: [{ $eq: ['$status', 'En attente'] }, 1, 0] } },
          enCours: { $sum: { $cond: [{ $eq: ['$status', 'En cours'] }, 1, 0] } },
          nonLivre: { $sum: { $cond: [{ $eq: ['$status', 'Non livré'] }, 1, 0] } },
          total: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$status', 'Livré'] }, { $eq: ['$status', 'processing'] }, { $not: ['$status'] }] },
                '$total',
                0
              ]
            }
          }
        }
      },
      {
        $facet: {
          data: [{ $skip: pageSize * (pageNumber - 1) }, { $limit: pageSize }],
          pagination: [{ $count: 'total' }]
        }
      }
    ])

    res.status(200).json({
      success: true,
      data: values.length > 0 ? values[0].data : [],
      pagination: {
        totalItems: values.length > 0 && values[0].pagination.length > 0 ? values[0].pagination[0].total : 0
      }
    })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}
