/**
 * @swagger
 * /api/dashboard/notifications/{id}:
 *   delete:
 *     summary: Supprimer une notification
 *     description: Supprime une notification spécifique.
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
 *         description: Notification supprimée
 */
import dbConnect from 'src/@apiCore/lib/mongodb'
import Notification from 'src/@apiCore/models/notification'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'DELETE') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    const notification = await Notification.findByIdAndDelete(id)
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' })
    }

    return res.status(200).json({
      success: true,
      message: 'Notification supprimée'
    })

  } catch (error) {
    console.error('❌ Delete Notification API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}