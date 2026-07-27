/**
 * @swagger
 * /api/dashboard/notifications:
 *   get:
 *     summary: Liste des notifications
 *     description: |
 *       Retourne la liste paginée des notifications avec filtres.
 *       
 *       **Filtres disponibles** :
 *       - `categorie` : toutes, commandes, alertes, finance, support
 *       - `statut` : toutes, non_lues, lues
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: categorie
 *         schema:
 *           type: string
 *           enum: [toutes, commandes, alertes, finance, support]
 *           default: toutes
 *
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [toutes, non_lues, lues]
 *           default: toutes
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *
 *     responses:
 *       200:
 *         description: Notifications récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type:
 *                             type: string
 *                           titre:
 *                             type: string
 *                           message:
 *                             type: string
 *                           categorie:
 *                             type: string
 *                           priorite:
 *                             type: string
 *                           est_lue:
 *                             type: boolean
 *                           date_creation:
 *                             type: string
 *                             format: date-time
 *                           temps_ecoule:
 *                             type: string
 *                           metadata:
 *                             type: object
 *                     pagination:
 *                       type: object
 *                     non_lues_count:
 *                       type: integer
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Notification from 'src/@apiCore/models/notifications'
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

    const { categorie = 'toutes', statut = 'toutes', page = 1, limit = 20 } = req.query

    // Construire les filtres
    const filter = {}
    
    if (categorie !== 'toutes') {
      filter.category = categorie
    }

    if (statut === 'non_lues') {
      filter.readBy = { $ne: auth.admin._id }
    } else if (statut === 'lues') {
      filter.readBy = auth.admin._id
    }

    // Récupérer les notifications
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    // Compter le total de notifications non lues
    const nonLuesCount = await Notification.countDocuments({
      category: categorie !== 'toutes' ? categorie : { $exists: true },
      readBy: { $ne: auth.admin._id }
    })

    const total = await Notification.countDocuments(filter)

    const formattedNotifications = notifications.map(notif => ({
      id: notif._id,
      type: notif.type,
      titre: notif.title,
      message: notif.message,
      categorie: notif.category,
      priorite: notif.priority,
      est_lue: notif.readBy?.some(id => id.toString() === auth.admin._id.toString()) || false,
      date_creation: notif.createdAt?.toISOString(),
      temps_ecoule: getTimeAgo(notif.createdAt),
      metadata: notif.metadata || {}
    }))

    return res.status(200).json({
      success: true,
      message: 'Notifications récupérées avec succès',
      data: {
        data: formattedNotifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        },
        non_lues_count: nonLuesCount
      }
    })

  } catch (error) {
    console.error('❌ Notifications API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}

function getTimeAgo(date) {
  if (!date) return ''
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'À l\'instant'
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} heure(s)`
  return `Il y a ${Math.floor(seconds / 86400)} jour(s)`
}