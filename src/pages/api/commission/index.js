import Commission from 'src/@apiCore/models/commission.js'
import dbConnect from 'src/@apiCore/lib/mongodb.js'
import mongoose from 'mongoose'

export default async function commission(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const { method } = req
  await dbConnect()
  switch (method) {
    case 'GET':
      try {
        const { page, limit } = req.query

        const pageNumber = parseInt(page) || 1
        const pageSize = parseInt(limit) || 10
        let queryData = {}
        if (req.query.user) {
          queryData.user = new mongoose.Types.ObjectId(req.query.user)

          // Filtre par plage de dates
          if (req.query.startDate && req.query.endDate) {
            const startOfDay = new Date(new Date(req.query.startDate).setUTCHours(0, 0, 0, 0))
            const endOfDay = new Date(new Date(req.query.endDate).setUTCHours(23, 59, 59, 999))

            queryData.createdAt = { $gte: startOfDay, $lte: endOfDay }
          }
          if (req.query.date) {
            const startOfDay = new Date(new Date(req.query.date).setUTCHours(0, 0, 0, 0))
            queryData.createdAt = startOfDay
          }
          let data = [
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: 'users',
              localField: 'buyer',
              foreignField: '_id',
              as: 'buyer'
            }
          },
            {
              $unwind: {
                path: '$buyer',
                preserveNullAndEmptyArrays: true
              }
            },
          {
            $match: {
              $and: [queryData]
            }
          }
        ]

          if (pageNumber)
            data.push({
              $facet: {
                data: [{ $skip: pageSize * (pageNumber - 1) }, { $limit: pageSize }],
                pagination: [{ $count: 'total' }]
              }
            })

          const zones = await Commission.aggregate(data)
          res.status(200).json({
            success: true,
            data: !req.query.page ? zones : zones.length > 0 ? zones[0].data : [],
            total: !req.query.page ? zones.length : zones.length > 0 ? zones[0].pagination[0]?.total || 0 : 0
          })
        } else res.status(400).json({ success: false })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        res.status(201).json({ success: true })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
