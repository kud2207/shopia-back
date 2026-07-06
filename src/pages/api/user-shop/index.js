import Shop from 'src/@apiCore/models/shop.js'
import dbConnect from 'src/@apiCore/lib/mongodb.js'
import authenticate from 'src/middleware/authenticate'

export default async function userShop(req, res) {
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
        const queryData = {
          isDelete: { $ne: true }
        }
        if (req.query.role == 'marchand' && req.userId) queryData.user = req.userId

        if (req.query.role == 'marchand' || req.query.role == 'admin') {
          const shops = await Shop.find(queryData).populate('categories').populate('deliveryCities')
          res.status(200).json({
            success: true,
            data: shops
          })
        } else res.status(400).json({ success: false })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        const fields = req.body
        const shop = await Shop.create(fields)
        if (shop) res.status(201).json({ success: true, data: shop })
        else res.status(400).json({ success: false })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
