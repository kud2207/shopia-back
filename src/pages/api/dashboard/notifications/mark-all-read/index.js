/**
 * @swagger
 * /api/dashboard/notifications/mark-all-read:
 *   patch:
 *     summary: Marquer toutes les notifications comme lues
 *     description: Marque toutes les notifications de l'admin comme lues.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Toutes les notifications marquées comme lues
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 marked_count:
 *                   type: integer
 *                   description: Nombre de notifications marquées
 */
import dbConnect from 'src/@apiCore/lib/mongodb'
import Notification from 'src/@apiCore/models/notifications'
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

    const result = await Notification.updateMany(
      { read: false },
      { 
        $set: { read: true },
        $addToSet: { readBy: auth.admin._id }
      }
    )

    return res.status(200).json({
      success: true,
      message: 'Toutes les notifications marquées comme lues',
      marked_count: result.modifiedCount
    })

  } catch (error) {
    console.error(' Mark All Read API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}