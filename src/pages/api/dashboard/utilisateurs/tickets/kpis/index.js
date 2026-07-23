/**
 * @swagger
 * /api/dashboard/utilisateurs/tickets/kpis:
 *   get:
 *     summary: KPIs du support et des tickets
 *     description: |
 *       Retourne les indicateurs clés du support technique en temps réel.
 *       
 *       **Métriques incluses** :
 *       - Nombre de tickets (ouverts, en cours, résolus, fermés) et leurs tendances
 *       - Temps de résolution moyen (en heures)
 *       - Comparaison avec l'objectif de 24h
 *     tags:
 *       - Utilisateurs - Support & tickets
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
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: KPIs support récupérés avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     tickets_ouverts:
 *                       type: integer
 *                       example: 2
 *                     tickets_ouverts_tendance:
 *                       type: number
 *                       example: 1
 *                     tickets_en_cours:
 *                       type: integer
 *                       example: 3
 *                     tickets_en_cours_tendance:
 *                       type: number
 *                       example: 2
 *                     tickets_resolus:
 *                       type: integer
 *                       example: 4
 *                     tickets_resolus_tendance:
 *                       type: number
 *                       example: 2
 *                     tickets_fermes:
 *                       type: integer
 *                       example: 2
 *                     tickets_fermes_tendance:
 *                       type: number
 *                       example: 1
 *                     temps_resolution_moyen:
 *                       type: number
 *                       description: Temps moyen en heures
 *                       example: 23
 *                     objectif_resolution:
 *                       type: number
 *                       example: 24
 *                     performance_objectif_atteint:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Ticket from 'src/@apiCore/models/ticket'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] })(req, res)
    if (auth.error) return auth.error
    await dbConnect()

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [currentOpen, previousOpen, currentInProgress, previousInProgress, currentResolved, previousResolved, currentClosed, previousClosed, resolutionStats] = await Promise.all([
      Ticket.countDocuments({ status: 'open', createdAt: { $gte: currentMonthStart } }),
      Ticket.countDocuments({ status: 'open', createdAt: { $gte: previousMonthStart, $lt: currentMonthStart } }),
      Ticket.countDocuments({ status: 'in_progress', createdAt: { $gte: currentMonthStart } }),
      Ticket.countDocuments({ status: 'in_progress', createdAt: { $gte: previousMonthStart, $lt: currentMonthStart } }),
      Ticket.countDocuments({ status: 'resolved', createdAt: { $gte: currentMonthStart } }),
      Ticket.countDocuments({ status: 'resolved', createdAt: { $gte: previousMonthStart, $lt: currentMonthStart } }),
      Ticket.countDocuments({ status: 'closed', createdAt: { $gte: currentMonthStart } }),
      Ticket.countDocuments({ status: 'closed', createdAt: { $gte: previousMonthStart, $lt: currentMonthStart } }),
      Ticket.aggregate([
        { $match: { status: { $in: ['resolved', 'closed'] }, resolvedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, avgResolutionTime: { $avg: '$resolutionTime' } } }
      ])
    ])

    const calculateTrend = (current, previous) => (!previous || previous === 0) ? (current > 0 ? 100 : 0) : Number((((current - previous) / previous) * 100).toFixed(1))
    const avgResolutionHours = resolutionStats[0]?.avgResolutionTime ? Math.round(resolutionStats[0].avgResolutionTime / (1000 * 60 * 60)) : 0

    return res.status(200).json({
      success: true,
      message: 'KPIs support récupérés avec succès',
      data: {
        tickets_ouverts: currentOpen, tickets_ouverts_tendance: calculateTrend(currentOpen, previousOpen),
        tickets_en_cours: currentInProgress, tickets_en_cours_tendance: calculateTrend(currentInProgress, previousInProgress),
        tickets_resolus: currentResolved, tickets_resolus_tendance: calculateTrend(currentResolved, previousResolved),
        tickets_fermes: currentClosed, tickets_fermes_tendance: calculateTrend(currentClosed, previousClosed),
        temps_resolution_moyen: avgResolutionHours,
        objectif_resolution: 24,
        performance_objectif_atteint: avgResolutionHours <= 24
      }
    })
  } catch (error) {
    console.error('❌ Tickets KPIs API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}