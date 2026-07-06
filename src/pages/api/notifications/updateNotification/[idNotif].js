import dbConnect from "src/@apiCore/lib/mongodb"
import notifications from "src/@apiCore/models/notifications"


export default async function updateNotification(req, res) {

    await dbConnect()
    let io = null
    if (res.socket.server.io) {
        io = res.socket.server.io
    }

    notifications.updateOne(
        { _id: req.query.idNotif },
        { $set: { read: req.body.read } }
    )
        .then(response => {
            if (response.modifiedCount == 1) {
                res.status(200).json({ message: "success_updated_notification", data: response })
            } else {
                res.status(500).json({ message: "error_create_notification", error: err.message || "error" })
            }
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({ message: "error_create_notification", error: err.message || "error" })
        })
}