import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import User from 'src/@apiCore/models/user'

export default async function getOrderUsers(req, res) {
  try {
    await dbConnect()
    try {
      const { idShop } = req.query
      var distinctValues = await Order.distinct('customer', { shop: idShop })

      // Find orders based on shop
      const users = await User.find({ _id: { $in: distinctValues } })

      res.status(200).json({
        success: true,
        data: users
      })
    } catch (error) {
      console.log(error)
      res.status(400).json({ success: false, message: error.message })
    }
  } catch (error) {
    res.status(500).json({ success: false, data: error.message })
  }
}
