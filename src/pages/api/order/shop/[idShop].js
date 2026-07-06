import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import mongoose from "mongoose"

export default async function getShopOrder(req, res) {
  try {
    await dbConnect()
    try {
      const { idShop, search, page, limit, sortBy, sortOrder } = req.query

     // Search
     let queryData = {}
     if (idShop) queryData.shop = new mongoose.Types.ObjectId(idShop)

     if (search) {
       queryData.$or = [
         { order_id: parseInt(search) },
         { description: { $regex: search, $options: 'i' } }
       ]
     }
      // Pagination
      const pageNumber = parseInt(page) || 1
      const pageSize = parseInt(limit) || 10

      // Sorting
      const sortOptions = {}
      if (sortBy) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
      }

      // const values = await Order.find({ shop: idShop, ...searchQuery })
      //   .populate({
      //     path: 'customer'
      //   })
      //   .populate({
      //     path: 'items',
      //     populate: { 
      //       path: 'product'
      //     }
      //   })
      //   .sort(sortOptions)
      //   .skip(skip)
      //   .limit(pageSize)


        const values = await Order.aggregate([
          { $sort: sortOptions },
          {
            $lookup: {
              from: 'users',
              localField: 'customer',
              foreignField: '_id',
              as: 'customer'
            }
          },
          {
            $unwind: {
              path: '$customer',
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
              data: [{ $skip: pageSize * (pageNumber-1) }, { $limit: pageSize }],
              pagination: [{ $count: 'total' }]
            }
          }
        ])
        res.status(200).json({
          success: true,
          data: values.length > 0 ? values[0].data : [],
          pagination: {
            totalItems: values.length > 0 ? values[0].pagination[0]?.total||0 : 0
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
