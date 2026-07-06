import dbConnect from 'src/@apiCore/lib/mongodb'
import DeliveryService from 'src/@apiCore/models/deliveryService'

export default async function getDeliverOrder(req, res) {
  try {
    await dbConnect()
    try {
      const deliveryService = await DeliveryService.find({ user: req.query.userId }).populate({
        path: "shops",
        populate: "shop"
      })

      res.status(200).json({ success: true, data: deliveryService })
    } catch (error) {
      console.log(error)
      res.status(400).json({ success: false, message: error.message })
    }
  } catch (error) {
    res.status(500).json({ success: false, data: error.message })
  }
}
