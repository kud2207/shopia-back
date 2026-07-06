import dbConnect from 'src/@apiCore/lib/mongodb'
import Product from 'src/@apiCore/models/product'
import authenticate from 'src/middleware/authenticate'

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
    const response = await Product.find({ shop: req.query.idShop, $or: [{ isDelete: { $exists: false } }, { isDelete: false }] }).sort({ createdAt: -1 })
    res.status(200).json({ success: true, data: response })
  } catch (error) {
    res.status(500).json({ success: false, data: error.message })
  }
}
