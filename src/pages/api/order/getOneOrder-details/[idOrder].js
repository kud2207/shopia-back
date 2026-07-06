import dbConnect from 'src/@apiCore/lib/mongodb'
import order from 'src/@apiCore/models/order'

export default async function getOrderDetails(req, res) {
  try {
    await dbConnect()
    const response = await order
      .findOne({ _id: req.query.idOrder })
      .populate({
        path: 'shop',
        populate: 'user city country'
      })
      .populate({
        path: 'customer'
      })
      .populate({
        path: 'items',
        populate: {
          path: 'product'
        }
      })
    res.status(200).json({ success: true, data: response })
  } catch (error) {
    res.status(500).json({ success: false, data: error.message })
  }
}
