import mongoose from 'mongoose'
import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'
import authenticate from 'src/middleware/authenticate'

export default async function orders(req, res) {
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, authorization"
  );
    //Preflight CORS handler
    if (req.method === "OPTIONS") {
      return res.status(200).json({
        body: "OK",
      });
    }
  const { method } = req
  await authenticate(req, res)
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        let queryData = { role: 'livreur' }
        const limit = parseInt(req.query.limit)
        if (req.query.city) {
          queryData['services.city'] = { $in: req.query.city.split(',').map(item => new mongoose.Types.ObjectId(item)) }
        }
        if (req.query.country) {
          queryData['services.country'] = new mongoose.Types.ObjectId(req.query.country)
        }
        if (req.query.type === 'my_company' && req.query.shopId) {
          queryData['shops.shop'] = { $in: [new mongoose.Types.ObjectId(req.query.shopId)] }
        }

        const users = await User.aggregate([
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: 'deliveryservices',
              localField: 'services',
              foreignField: '_id',
              as: 'services'
            }
          },
          {
            $lookup: {
              from: 'cities',
              localField: 'services.city',
              foreignField: '_id',
              as: 'cityDetails'
            }
          },
          {
            $lookup: {
              from: 'shopservices',
              localField: 'services.shops',
              foreignField: '_id',
              as: 'shops'
            }
          },
          {
            $match: {
              $and: [queryData]
            }
          },
          {
            $facet: {
              data: [{ $skip: req.query.page >= 0 ? req.query.page * limit : 0 }, { $limit: limit }],
              pagination: [{ $count: 'total' }]
            }
          }
        ])

        if (users.length > 0)
          res.status(200).json({
            success: true,
            data: users[0].data,
            total: users[0]?.pagination[0]?.total || 0
          })
        else res.status(400).json({ success: false })
      } catch (error) {
        console.error(error) // Log the error for debugging
        res.status(500).json({ success: false, error: 'Internal Server Error' })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
