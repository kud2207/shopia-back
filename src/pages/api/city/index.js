import City from 'src/@apiCore/models/city.js'
import dbConnect from 'src/@apiCore/lib/mongodb'

export default async function city(req, res) {
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, authorization"
  );
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
        if (req.query.country) {
          const values = await City.find({ country: req.query.country })
          res.status(200).json({
            success: true,
            data: values
          })
        } else {
          let data = [
            { $sort: { createdAt: 1 } },
            {
              $lookup: {
                from: 'countries',
                localField: 'country',
                foreignField: '_id',
                as: 'country'
              }
            },
            {
              $unwind: {
                path: '$country',
                preserveNullAndEmptyArrays: true
              }
            }
          ]
          if (req.query.page)
            data.push({
              $facet: {
                data: [{ $skip: req.query.page >= 0 ? req.query.page * 8 : 0 }, { $limit: 8 }],
                pagination: [{ $count: 'total' }]
              }
            })

          const cities = await City.aggregate(data)
          res.status(200).json({
            success: true,
            data: !req.query.page ? cities : cities.length > 0 ? cities[0].data : [],
            total: !req.query.page ? cities.length : cities.length > 0 ? cities[0].pagination[0]?.total || 0 : 0
          })
        }
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
      }
      break
    case 'POST':
      try {
        const fields = req.body
        const conv = await City.create(fields)

        if (conv) res.status(201).json({ success: true, data: conv })
        else res.status(400).json({ success: false })
      } catch (error) {
        res.status(400).json({ success: false, message: error.message })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
