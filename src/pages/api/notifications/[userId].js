import dbConnect from 'src/@apiCore/lib/mongodb'
import notifications from 'src/@apiCore/models/notifications'

export default async function getNotifications(req, res) {
  try {
    await dbConnect()
    const response = await notifications.find({ toChannel: req.query.userId })
    .sort({ createdAt: -1 }).limit(100)
    res.status(200).json({ success: true, data: response })
  } catch (error) {
    res.status(500).json({ success: false, data: error.message })
  }
}