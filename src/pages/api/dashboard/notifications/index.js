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

    const { categorie = 'toutes', statut = 'toutes', page = 1, limit = 20 } = req.query

    const filter = {}
    
    if (categorie !== 'toutes') {
      filter.category = categorie
    }

    if (statut === 'non_lues') {
      filter.read = false
    } else if (statut === 'lues') {
      filter.read = true
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    const nonLuesCount = await Notification.countDocuments({
      ...(categorie !== 'toutes' ? { category: categorie } : {}),
      read: false
    })

    const total = await Notification.countDocuments(filter)

    const formattedNotifications = notifications.map(notif => ({
      id: notif._id,
      type: notif.type || 'info',
      titre: notif.title,
      message: notif.content,
      categorie: notif.category || 'support',
      priorite: notif.priority || 'info',
      est_lue: notif.read || false,
      date_creation: notif.createdAt?.toISOString(),
      temps_ecoule: getTimeAgo(notif.createdAt),
      metadata: notif.metadata || {},
      redirectionLink: notif.redirectionLink,
      redirectionLabel: notif.redirectionLabel
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