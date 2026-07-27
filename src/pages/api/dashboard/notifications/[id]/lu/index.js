/**
 * @swagger
 * /api/dashboard/notifications/{id}/lu:
 *   patch:
 *     summary: Marquer une notification comme lue
 *     description: Marque une notification spécifique comme lue par l'admin connecté.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *
 *     responses:
 *       200:
 *         description: Notification marquée comme lue
 */
import dbConnect from 'src/@apiCore/lib/mongodb'
import Notification from 'src/@apiCore/models/notification'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    const notification = await Notification.findById(id)
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' })
    }

    notification.read = true
    if (!notification.readBy) notification.readBy = []
    if (!notification.readBy.some(id => id.toString() === auth.admin._id.toString())) {
      notification.readBy.push(auth.admin._id)
    }
    await notification.save()

    return res.status(200).json({
      success: true,
      message: 'Notification marquée comme lue'
    })

  } catch (error) {
    console.error('❌ Mark as Read API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}