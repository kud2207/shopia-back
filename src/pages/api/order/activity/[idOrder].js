import dbConnect from 'src/@apiCore/lib/mongodb'
import orderActivity from 'src/@apiCore/models/orderActivity'

export default async function getOrderActivity(req, res) {
    try {
        await dbConnect()
        try {
            const { idOrder } = req.query

            const activities = await orderActivity.find({ orderId: idOrder })
            res.status(200).json({
                success: true,
                data: activities
            })
        } catch (error) {
            console.log(error)
            res.status(400).json({ success: false, message: error.message })
        }
    } catch (error) {
        res.status(500).json({ success: false, data: error.message })
    }
}