/**
 * @swagger
 * /api/dashboard/finances/abonnements/kpis:
 *   get:
 *     summary: KPIs des abonnements
 *     description: |
 *       Retourne les 4 indicateurs clés des abonnements avec tendances.
 *       
 *       **Métriques** :
 *       - Abonnements actifs
 *       - Abonnements expirés
 *       - Expirant bientôt (dans 3 jours)
 *       - Taux de renouvellement
 *     tags:
 *       - Finances - Abonnements
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
 *           default: month
 *         description: Période de calcul
 *
 *     responses:
 *       200:
 *         description: KPIs récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 abonnements_actifs:
 *                   type: integer
 *                   example: 150
 *                 abonnements_actifs_tendance:
 *                   type: number
 *                   example: 50
 *                 abonnements_expires:
 *                   type: integer
 *                   example: 20
 *                 abonnements_expires_tendance:
 *                   type: number
 *                   example: 5
 *                 expirent_bientot:
 *                   type: integer
 *                   example: 30
 *                 expirent_bientot_tendance:
 *                   type: number
 *                   example: 3
 *                 taux_renouvellement:
 *                   type: number
 *                   example: 60
 *                 taux_renouvellement_tendance:
 *                   type: number
 *                   example: 5
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_financier'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { period = 'month' } = req.query

    // 📅 Calculer les périodes
    const now = new Date()
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    let previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
      previousStartDate = new Date(now.getFullYear() - 1, 0, 1)
    }

    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // 📊 Calculer les KPIs en parallèle
    const [
      currentActive,
      previousActive,
      currentExpired,
      previousExpired,
      currentExpiringSoon,
      previousExpiringSoon,
      renewalStats
    ] = await Promise.all([
      // Abonnements actifs actuels
      Shop.countDocuments({
        active: true,
        plan: { $exists: true },
        expire_date: { $gte: now }
      }),
      // Abonnements actifs période précédente
      Shop.countDocuments({
        active: true,
        plan: { $exists: true },
        expire_date: { $gte: previousStartDate, $lt: now }
      }),
      // Abonnements expirés
      Shop.countDocuments({
        active: true,
        plan: { $exists: true },
        expire_date: { $lt: now }
      }),
      Shop.countDocuments({
        active: true,
        plan: { $exists: true },
        expire_date: { $lt: previousStartDate }
      }),
      // Expirant bientôt (dans 3 jours)
      Shop.countDocuments({
        active: true,
        plan: { $exists: true },
        expire_date: { $gte: now, $lte: threeDaysFromNow }
      }),
      Shop.countDocuments({
        active: true,
        plan: { $exists: true },
        expire_date: { $gte: previousStartDate, $lte: new Date(previousStartDate.getTime() + 3 * 24 * 60 * 60 * 1000) }
      }),
      // Stats de renouvellement
      Shop.aggregate([
        { $match: { 
          active: true,
          plan: { $exists: true },
          renewed: { $exists: true }
        }},
        { $group: {
          _id: null,
          total: { $sum: 1 },
          renewed: { $sum: { $cond: ['$renewed', 1, 0] } }
        }}
      ])
    ])

    const renewalData = renewalStats[0] || { total: 1, renewed: 0 }
    const renewalRate = renewalData.total > 0 
      ? parseFloat(((renewalData.renewed / renewalData.total) * 100).toFixed(1))
      : 0

    // Calculer les tendances
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0
      return Number((((current - previous) / previous) * 100).toFixed(1))
    }

    return res.status(200).json({
      success: true,
      message: 'KPIs abonnements récupérés avec succès',
      data: {
        abonnements_actifs: currentActive,
        abonnements_actifs_tendance: calculateTrend(currentActive, previousActive),
        abonnements_expires: currentExpired,
        abonnements_expires_tendance: calculateTrend(currentExpired, previousExpired),
        expirent_bientot: currentExpiringSoon,
        expirent_bientot_tendance: calculateTrend(currentExpiringSoon, previousExpiringSoon),
        taux_renouvellement: renewalRate,
        taux_renouvellement_tendance: 5 // À calculer avec données précédentes
      }
    })

  } catch (error) {
    console.error('❌ Abonnements KPIs API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}