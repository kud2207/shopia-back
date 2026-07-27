/**
 * @swagger
 * /api/dashboard/profil/moi/activity-log:
 *   get:
 *     summary: Mon journal d'activité
 *     description: |
 *       Retourne l'historique des actions effectuées par l'admin connecté.
 *       
 *       **Filtres disponibles** :
 *       - Uniquement les actions de l'admin connecté
 *       - Pagination disponible
 *     tags:
 *       - Profil Admin
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
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
 *         description: Journal d'activité récupéré avec succès
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
 *                           type_evenement:
 *                             type: string
 *                           description:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           temps_ecoule:
 *                             type: string
 *                     pagination:
 *                       type: object
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import AuditLog from 'src/@apiCore/models/auditLog'
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

    const { page = 1, limit = 20 } = req.query

    // Récupérer uniquement les actions de l'admin connecté
    const logs = await AuditLog.find({ userId: auth.admin._id })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    const total = await AuditLog.countDocuments({ userId: auth.admin._id })

    const formattedLogs = logs.map(log => ({
      id: log._id,
      type_evenement: getEventTypeLabel(log.action),
      description: log.details?.changes || log.details?.action || 'Action non spécifiée',
      date: log.createdAt?.toISOString(),
      temps_ecoule: getTimeAgo(log.createdAt)
    }))

    return res.status(200).json({
      success: true,
      message: 'Journal d\'activité récupéré avec succès',
      data: {
        data: formattedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }
    })

  } catch (error) {
    console.error('❌ Activity Log API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}

function getEventTypeLabel(action) {
  const labels = {
    'LOGIN': 'Connexion',
    'LOGOUT': 'Déconnexion',
    'MODIFY_PROFILE': 'Modification profil',
    'CHANGE_PASSWORD': 'Changement mot de passe',
    'MODIFY_ACCOUNT': 'Modification compte',
    'CREATE_ADMIN': 'Création admin',
    'SUSPEND_ACCOUNT': 'Suspension compte',
    'RESOLVE_TICKET': 'Résolution ticket'
  }
  return labels[action] || action
}

function getTimeAgo(date) {
  if (!date) return 'Inconnu'
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'À l\'instant'
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} heure(s)`
  return `Il y a ${Math.floor(seconds / 86400)} jour(s)`
}