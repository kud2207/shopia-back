/**
 * @swagger
 * /api/dashboard/notifications/clear-all:
 *   delete:
 *     summary: Supprimer toutes les notifications
 *     description: |
 *       Supprime toutes les notifications (optionnel : filtrer par catégorie).
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categorie:
 *                 type: string
 *                 enum: [toutes, commandes, alertes, finance, support]
 *                 default: toutes
 *
 *     responses:
 *       200:
 *         description: Notifications supprimées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deleted_count:
 *                   type: integer
 *                   description: Nombre de notifications supprimées
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

    const { categorie = 'toutes' } = req.body

    const filter = {}
    if (categorie !== 'toutes') {
      filter.category = categorie
    }

    const result = await Notification.deleteMany(filter)

    return res.status(200).json({
      success: true,
      message: 'Notifications supprimées',
      deleted_count: result.deletedCount
    })

  } catch (error) {
    console.error('❌ Clear All Notifications API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}