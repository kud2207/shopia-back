/**
 * @swagger
 * /api/boutiques/livraison/stats:
 *   get:
 *     summary: Statistiques globales des services de livraison
 *     description: |
 *       Retourne les KPIs agrégés pour le suivi des entreprises de livraison.
 *       
 *       **Métriques** :
 *       - Partenaires actifs
 *       - Commandes du mois
 *       - Montant collecté
 *       - Taux de livraison
 *     tags:
 *       - Livraison
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *           default: month
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     partenaires_actifs:
 *                       type: integer
 *                       example: 100
 *
 *                     partenaires_actifs_tendance:
 *                       type: number
 *                       example: 5
 *
 *                     commandes_mois:
 *                       type: integer
 *                       example: 50
 *
 *                     commandes_mois_tendance:
 *                       type: number
 *                       example: 8
 *
 *                     montant_collecte:
 *                       type: number
 *                       example: 100000
 *
 *                     montant_collecte_tendance:
 *                       type: number
 *                       example: 3
 *
 *                     taux_livraison:
 *                       type: number
 *                       example: 88.5
 *
 *                     taux_livraison_tendance:
 *                       type: number
 *                       example: 3
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import Order from 'src/@apiCore/models/order'
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

    const { period = 'month' } = req.query

    // 📅 Calculer les périodes
    const now = new Date()
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    let previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    } else if (period === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      startDate = weekAgo
      const previousWeek = new Date(now)
      previousWeek.setDate(now.getDate() - 14)
      previousStartDate = previousWeek
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
      previousStartDate = new Date(now.getFullYear() - 1, 0, 1)
    }

    // 🔧 Filtres pour les services de livraison
    const deliveryFilter = {
      type: { $in: ['delivery', 'livraison'] },
      active: true
    }

    const orderFilter = {
      createdAt: { $gte: startDate },
      'shopInfo.type': { $in: ['delivery', 'livraison'] }
    }

    const previousOrderFilter = {
      createdAt: { $gte: previousStartDate, $lt: startDate },
      'shopInfo.type': { $in: ['delivery', 'livraison'] }
    }

    // 📊 Calculer les stats en parallèle
    const [
      currentPartners,
      previousPartners,
      currentOrders,
      previousOrders,
      deliveryStats
    ] = await Promise.all([
      // Partenaires actifs actuels
      Shop.countDocuments(deliveryFilter),
      // Partenaires actifs mois précédent (approximation)
      Shop.countDocuments(deliveryFilter),
      // Commandes du mois
      Order.aggregate([
        { $lookup: { from: 'shops', localField: 'shop', foreignField: '_id', as: 'shopInfo' } },
        { $unwind: '$shopInfo' },
        { $match: { 
          ...orderFilter,
          'shopInfo.type': { $in: ['delivery', 'livraison'] }
        }},
        { $count: 'total' }
      ]),
      // Commandes mois précédent
      Order.aggregate([
        { $lookup: { from: 'shops', localField: 'shop', foreignField: '_id', as: 'shopInfo' } },
        { $unwind: '$shopInfo' },
        { $match: { 
          ...previousOrderFilter,
          'shopInfo.type': { $in: ['delivery', 'livraison'] }
        }},
        { $count: 'total' }
      ]),
      // Stats de livraison
      Order.aggregate([
        { $lookup: { from: 'shops', localField: 'shop', foreignField: '_id', as: 'shopInfo' } },
        { $unwind: '$shopInfo' },
        { $match: { 
          ...orderFilter,
          'shopInfo.type': { $in: ['delivery', 'livraison'] },
          status: { $in: ['Livrée', 'Non livrée', 'Annulée'] }
        }},
        { $group: {
          _id: null,
          total: { $sum: 1 },
          livrees: { $sum: { $cond: [{ $eq: ['$status', 'Livrée'] }, 1, 0] } },
          montant: { $sum: { $cond: [{ $eq: ['$status', 'Livrée'] }, '$total', 0] } }
        }}
      ])
    ])

    const ordersCount = currentOrders[0]?.total || 0
    const previousOrdersCount = previousOrders[0]?.total || 0
    const deliveryData = deliveryStats[0] || { total: 0, livrees: 0, montant: 0 }

    const deliveryRate = deliveryData.total > 0 
      ? parseFloat(((deliveryData.livrees / deliveryData.total) * 100).toFixed(1))
      : 0

    // Calculer les tendances
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0
      return Number((((current - previous) / previous) * 100).toFixed(1))
    }

    return res.status(200).json({
      success: true,
      message: 'Statistiques livraison récupérées avec succès',
      data: {
        partenaires_actifs: currentPartners,
        partenaires_actifs_tendance: calculateTrend(currentPartners, previousPartners),
        commandes_mois: ordersCount,
        commandes_mois_tendance: calculateTrend(ordersCount, previousOrdersCount),
        montant_collecte: Math.round(deliveryData.montant || 0),
        montant_collecte_tendance: 3, // À calculer avec les données précédentes
        taux_livraison: deliveryRate,
        taux_livraison_tendance: 3 // À calculer avec les données précédentes
      }
    })

  } catch (error) {
    console.error('❌ Livraison Stats API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}