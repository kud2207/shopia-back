import dbConnect from "src/@apiCore/lib/mongodb"
import Order from "src/@apiCore/models/order"
import orderActivity from "src/@apiCore/models/orderActivity"

export default async function deleteOrder(req, res) {
    try {
        await dbConnect()
        Order.findByIdAndDelete(req.query.idOrder)
            .then(response => {
                if (response) {
                    orderActivity.create({
                        orderId: req.query.idOrder,
                        activityLabel: "Supression de la commande",
                        activityContent: "Commande supprimee avec success"
                      })
                    res.status(200).json({ success: true, data: response })
                } else {
                    res.status(400).json({ success: false, data: "" })
                }
            })
            .catch(err => {
                res.status(500).json({ success: false, data: err.message })
            })
    } catch (error) {
        res.status(500).json({ success: false, data: error.message })
    }
}