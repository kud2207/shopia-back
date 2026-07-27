/**
 * @swagger
 * /api/dashboard/notifications/compteur:
 *   get:
 *     summary: Compteur de notifications non lues
 *     description: Retourne le nombre total de notifications non lues et le détail par catégorie.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Compteur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_non_lues:
 *                   type: integer
 *                   example: 3
 *                 par_categorie:
 *                   type: object
 *                   properties:
 *                     commandes:
 *                       type: integer
 *                     alertes:
 *                       type: integer
 *                     finance:
 *                       type: integer
 *                     support:
 *                       type: integer
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Notification from 'src/@apiCore/models/notification'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    // Compter le total de notifications non lues
    const totalNonLues = await Notification.countDocuments({
      readBy: { $ne: auth.admin._id }
    })

    // Compter par catégorie
    const parCategorie = await Notification.aggregate([
      { 
        $match: { 
          readBy: { $ne: auth.admin._id }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ])

    // Formater le résultat
    const categoriesCount = {
      commandes: 0,
      alertes: 0,
      finance: 0,
      support: 0
    }

    parCategorie.forEach(item => {
      if (categoriesCount.hasOwnProperty(item._id)) {
        categoriesCount[item._id] = item.count
      }
    })

    return res.status(200).json({
      success: true,
      data: {
        total_non_lues: totalNonLues,
        par_categorie: categoriesCount
      }
    })

  } catch (error) {
    console.error('❌ Notification Counter API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}