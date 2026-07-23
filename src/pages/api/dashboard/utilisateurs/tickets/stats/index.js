/**
 * @swagger
 * /api/dashboard/utilisateurs/tickets/stats:
 *   get:
 *     summary: Statistiques détaillées des tickets (30 derniers jours)
 *     description: |
 *       Retourne les statistiques approfondies pour le calcul du temps de résolution moyen 
 *       et la répartition des tickets par priorité et par catégorie.
 *     tags:
 *       - Utilisateurs - Support & tickets
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
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
 *                   example: Statistiques tickets récupérées avec succès
 *                 data:
 *                   type: object
 *                   properties:
 *                     periode:
 *                       type: object
 *                       properties:
 *                         debut:
 *                           type: string
 *                           format: date
 *                         fin:
 *                           type: string
 *                           format: date
 *                     temps_resolution_moyen_heures:
 *                       type: integer
 *                       example: 23
 *                     total_tickets_resolus:
 *                       type: integer
 *                       example: 45
 *                     repartition_priorites:
 *                       type: object
 *                       description: Objet clé-valeur (ex: {"Critique": 5, "Haute": 12})
 *                       additionalProperties:
 *                         type: integer
 *                     repartition_categories:
 *                       type: object
 *                       description: Objet clé-valeur (ex: {"Bot WhatsApp": 15})
 *                       additionalProperties:
 *                         type: integer
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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [resolutionStats, priorityStats, categoryStats, totalResolved] = await Promise.all([
      Ticket.aggregate([{ $match: { status: { $in: ['resolved', 'closed'] }, resolvedAt: { $gte: thirtyDaysAgo }, resolutionTime: { $exists: true } } }, { $group: { _id: null, avgResolutionTime: { $avg: '$resolutionTime' }, minResolutionTime: { $min: '$resolutionTime' }, maxResolutionTime: { $max: '$resolutionTime' } } }]),
      Ticket.aggregate([{ $match: { createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Ticket.aggregate([{ $match: { createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Ticket.countDocuments({ status: { $in: ['resolved', 'closed'] }, resolvedAt: { $gte: thirtyDaysAgo } })
    ])

    const stats = resolutionStats[0] || { avgResolutionTime: 0 }
    
    return res.status(200).json({
      success: true, message: 'Statistiques tickets récupérées avec succès',
      data: {
        periode: { debut: thirtyDaysAgo.toISOString().split('T')[0], fin: now.toISOString().split('T')[0] },
        temps_resolution_moyen_heures: Math.round(stats.avgResolutionTime / (1000 * 60 * 60)),
        total_tickets_resolus: totalResolved,
        repartition_priorites: Object.fromEntries(priorityStats.map(s => [s._id || 'non_defini', s.count])),
        repartition_categories: Object.fromEntries(categoryStats.map(s => [s._id || 'non_defini', s.count]))
      }
    })
  } catch (error) {
    console.error('❌ Tickets Stats API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}