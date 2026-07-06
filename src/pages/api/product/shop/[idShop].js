import dbConnect from 'src/@apiCore/lib/mongodb'
import Product from 'src/@apiCore/models/product'
import authenticate from 'src/middleware/authenticate'
import mongoose from 'mongoose'

export default async function getShopProduct(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  try {
    await authenticate(req, res)
    await dbConnect()
    try {
      const { idShop, search, page, limit, sortBy, sortOrder } = req.query

      // Search
      let queryData = {}
      if (idShop) queryData.shop = new mongoose.Types.ObjectId(idShop)

      if (search) {
        queryData.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }
      // Pagination
      const pageNumber = parseInt(page) || 1
      const pageSize = parseInt(limit) || 10

      // Sorting
      const sortOptions = { createdAt: -1 }
      if (sortBy) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
      }

      const values = await Product.aggregate([
        { $sort: sortOptions },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user'
          }
        },

        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true
          }
        },

        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            $and: [queryData]
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
          totalItems: values.length > 0 ? values[0].pagination[0]?.total || 0 : 0
        }
      })
    } catch (error) {
      console.log(error)
      res.status(400).json({ success: false, message: error.message })
    }
  } catch (error) {
    res.status(500).json({ success: false, data: error.message })
  }
}
