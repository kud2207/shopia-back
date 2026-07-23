/**
 * @swagger
 * /api/dashboard/utilisateurs/audit-log/kpis:
 *   get:
 *     summary: KPIs du journal d'audit
 *     description: |
 *       Retourne les indicateurs clés des actions administrateurs.
 *       
 *       **Métriques** :
 *       - Connexions
 *       - Modifications
 *       - Abonnements
 *       - Suspensions
 *       - Tickets résolus
 *     tags:
 *       - Utilisateurs - Journal d'activité
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: KPIs récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connexions:
 *                   type: integer
 *                   example: 4
 *                 connexions_tendance:
 *                   type: number
 *                   example: 1
 *                 modifications:
 *                   type: integer
 *                   example: 2
 *                 modifications_tendance:
 *                   type: number
 *                   example: 2
 *                 abonnements:
 *                   type: integer
 *                   example: 2
 *                 abonnements_tendance:
 *                   type: number
 *                   example: 2
 *                 suspensions:
 *                   type: integer
 *                   example: 2
 *                 suspensions_tendance:
 *                   type: number
 *                   example: 1
 *                 tickets_resolus:
 *                   type: integer
 *                   example: 2
 *                 tickets_resolus_tendance:
 *                   type: number
 *                   example: 1
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

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // 📊 Calculer tous les KPIs en parallèle
    const [
      currentLogins,
      previousLogins,
      currentModifications,
      previousModifications,
      currentSubscriptions,
      previousSubscriptions,
      currentSuspensions,
      previousSuspensions,
      currentResolvedTickets,
      previousResolvedTickets
    ] = await Promise.all([
      // Connexions
      AuditLog.countDocuments({ 
        action: { $in: ['LOGIN', 'LOGOUT'] },
        createdAt: { $gte: currentMonthStart }
      }),
      AuditLog.countDocuments({ 
        action: { $in: ['LOGIN', 'LOGOUT'] },
        createdAt: { $gte: previousMonthStart, $lt: currentMonthStart }
      }),

      // Modifications (comptes, admins, permissions)
      AuditLog.countDocuments({ 
        action: { $in: ['UPDATE_ADMIN', 'MODIFY_ACCOUNT', 'UPDATE_PERMISSIONS'] },
        createdAt: { $gte: currentMonthStart }
      }),
      AuditLog.countDocuments({ 
        action: { $in: ['UPDATE_ADMIN', 'MODIFY_ACCOUNT', 'UPDATE_PERMISSIONS'] },
        createdAt: { $gte: previousMonthStart, $lt: currentMonthStart }
      }),

      // Abonnements (changements, réactivations)
      AuditLog.countDocuments({ 
        action: { $in: ['CHANGE_SUBSCRIPTION', 'REACTIVATE_SHOP', 'CREATE_SUBSCRIPTION'] },
        createdAt: { $gte: currentMonthStart }
      }),
      AuditLog.countDocuments({ 
        action: { $in: ['CHANGE_SUBSCRIPTION', 'REACTIVATE_SHOP', 'CREATE_SUBSCRIPTION'] },
        createdAt: { $gte: previousMonthStart, $lt: currentMonthStart }
      }),

      // Suspensions
      AuditLog.countDocuments({ 
        action: { $in: ['SUSPEND_ACCOUNT', 'DEACTIVATE_ADMIN', 'DEACTIVATE_COLLABORATOR'] },
        createdAt: { $gte: currentMonthStart }
      }),
      AuditLog.countDocuments({ 
        action: { $in: ['SUSPEND_ACCOUNT', 'DEACTIVATE_ADMIN', 'DEACTIVATE_COLLABORATOR'] },
        createdAt: { $gte: previousMonthStart, $lt: currentMonthStart }
      }),

      // Tickets résolus
      AuditLog.countDocuments({ 
        action: { $in: ['RESOLVE_TICKET', 'CLOSE_TICKET'] },
        createdAt: { $gte: currentMonthStart }
      }),
      AuditLog.countDocuments({ 
        action: { $in: ['RESOLVE_TICKET', 'CLOSE_TICKET'] },
        createdAt: { $gte: previousMonthStart, $lt: currentMonthStart }
      })
    ])

    // Calculer les tendances
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0
      return Number((((current - previous) / previous) * 100).toFixed(1))
    }

    return res.status(200).json({
      success: true,
      message: 'KPIs audit log récupérés avec succès',
      data: {
        connexions: currentLogins,
        connexions_tendance: calculateTrend(currentLogins, previousLogins),
        modifications: currentModifications,
        modifications_tendance: calculateTrend(currentModifications, previousModifications),
        abonnements: currentSubscriptions,
        abonnements_tendance: calculateTrend(currentSubscriptions, previousSubscriptions),
        suspensions: currentSuspensions,
        suspensions_tendance: calculateTrend(currentSuspensions, previousSuspensions),
        tickets_resolus: currentResolvedTickets,
        tickets_resolus_tendance: calculateTrend(currentResolvedTickets, previousResolvedTickets)
      }
    })

  } catch (error) {
    console.error('❌ Audit Log KPIs API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}