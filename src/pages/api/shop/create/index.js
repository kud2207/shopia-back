import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'

export default async function createShop(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  const { name, description, user } = req.body

  // Connect to database
  await dbConnect()

  try {
    if (user && name) {
      const shop = await Shop.create({ name, description, user })
      const userD = await User.findOne({ _id: user })
      if (userD && shop) userD.addShop(shop._id)
      if (shop) res.status(200).json({ message: 'success_create_shop', data: shop })
      else res.status(500).json({ message: 'error_create_shop' })
    }
  } catch (error) {
    res.status(500).json({ message: 'error_create_shop', error: error.message || 'error' })
  }
}
