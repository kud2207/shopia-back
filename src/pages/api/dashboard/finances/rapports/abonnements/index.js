/**
 * @swagger
 * /api/dashboard/finances/rapports/abonnements:
 *   get:
 *     summary: Rapport abonnements
 *     description: |
 *       Retourne les KPIs et la liste détaillée des abonnements.
 *       
 *       **KPIs** :
 *       - Revenus des abonnements
 *       - Taux de renouvellement
 *       - Formules premium actives
 *     tags:
 *       -Finances - Rapports Financiers
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, month, quarter, year]
 *           default: month
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
 *         description: Rapport abonnements récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 kpis:
 *                   type: object
 *                   properties:
 *                     revenus_abonnements:
 *                       type: number
 *                     revenus_abonnements_tendance:
 *                       type: number
 *                     taux_renouvellement:
 *                       type: number
 *                     taux_renouvellement_tendance:
 *                       type: number
 *                     formule_premium_active:
 *                       type: integer
 *                     formule_premium_active_tendance:
 *                       type: number
 *                 abonnements:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           abonne:
 *                             type: string
 *                           formule:
 *                             type: string
 *                             enum: [starter, premium, entreprise]
 *                           montant_paye:
 *                             type: number
 *                           date_encaissement:
 *                             type: string
 *                             format: date
 *                           mode_reglement:
 *                             type: string
 *                             enum: [carte_bancaire, mobile_money, virement]
 *                     pagination:
 *                       type: object
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import Plan from 'src/@apiCore/models/plan'
import Payment from 'src/@apiCore/models/payment'
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

    const { 
      period = 'month',
      page = 1, 
      limit = 20 
    } = req.query

    //  Calculer les périodes
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

    // 📊 Calculer les KPIs
    const [
      currentRevenue,
      previousRevenue,
      currentPremium,
      previousPremium,
      renewalStats,
      subscriptions
    ] = await Promise.all([
      // Revenus abonnements actuels
      Shop.aggregate([
        { $match: { 
          plan: { $exists: true },
          subscription_date: { $gte: startDate }
        }},
        { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
        { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
        { $group: { _id: null, total: { $sum: { $ifNull: ['$planInfo.price', 0] } } } }
      ]),
      // Revenus période précédente
      Shop.aggregate([
        { $match: { 
          plan: { $exists: true },
          subscription_date: { $gte: previousStartDate, $lt: startDate }
        }},
        { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
        { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
        { $group: { _id: null, total: { $sum: { $ifNull: ['$planInfo.price', 0] } } } }
      ]),
      // Formules premium actives
      Shop.countDocuments({
        plan: { $exists: true },
        'planInfo.name': { $regex: /premium/i },
        active: true,
        expire_date: { $gte: now }
      }),
      Shop.countDocuments({
        plan: { $exists: true },
        'planInfo.name': { $regex: /premium/i },
        active: true,
        expire_date: { $gte: previousStartDate, $lt: now }
      }),
      // Stats de renouvellement
      Shop.aggregate([
        { $match: { 
          plan: { $exists: true },
          renewed: { $exists: true }
        }},
        { $group: {
          _id: null,
          total: { $sum: 1 },
          renewed: { $sum: { $cond: ['$renewed', 1, 0] } }
        }}
      ]),
      // Liste des abonnements
      getSubscriptions(startDate, parseInt(page), parseInt(limit))
    ])

    const getValue = (arr) => (arr[0]?.total || 0)
    const revenueCurrent = getValue(currentRevenue)
    const revenuePrevious = getValue(previousRevenue)

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
      message: 'Rapport abonnements récupéré avec succès',
      kpis: {
        revenus_abonnements: Math.round(revenueCurrent),
        revenus_abonnements_tendance: calculateTrend(revenueCurrent, revenuePrevious),
        taux_renouvellement: renewalRate,
        taux_renouvellement_tendance: calculateTrend(renewalRate, renewalRate - 5),
        formule_premium_active: currentPremium,
        formule_premium_active_tendance: calculateTrend(currentPremium, previousPremium)
      },
      abonnements: subscriptions
    })

  } catch (error) {
    console.error('❌ Rapport Abonnements API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// Helper pour récupérer les abonnements
async function getSubscriptions(startDate, page, limit) {
  const subscriptions = await Shop.aggregate([
    { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
    { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
    { $match: { 
      plan: { $exists: true },
      subscription_date: { $gte: startDate }
    }},
    { $sort: { subscription_date: -1 }},
    { $skip: (page - 1) * limit },
    { $limit: limit }
  ])

  const total = await Shop.aggregate([
    { $match: { 
      plan: { $exists: true },
      subscription_date: { $gte: startDate }
    }},
    { $count: 'total' }
  ])

  const formattedData = subscriptions.map(sub => {
    let formule = 'starter'
    if (sub.planInfo?.name?.toLowerCase().includes('premium')) formule = 'premium'
    else if (sub.planInfo?.name?.toLowerCase().includes('entreprise')) formule = 'entreprise'

    return {
      id: sub._id,
      abonne: sub.name,
      formule: formule,
      montant_paye: sub.planInfo?.price || 0,
      date_encaissement: sub.subscription_date?.toISOString().split('T')[0] || '-',
      mode_reglement: 'carte_bancaire' // À remplacer par vraie donnée
    }
  })

  const totalCount = total[0]?.total || 0

  return {
    data: formattedData,
    pagination: {
      page,
      limit,
      total: totalCount,
      total_pages: Math.ceil(totalCount / limit)
    }
  }
}