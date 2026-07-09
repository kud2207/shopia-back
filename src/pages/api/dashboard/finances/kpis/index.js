/**
 * @swagger
 * /api/dashboard/finances/kpis:
 *   get:
 *     summary: KPIs financiers globaux
 *     description: |
 *       Retourne les 8 indicateurs financiers clés avec leurs tendances.
 *       
 *       **Métriques** :
 *       - Chiffre d'affaires global
 *       - Frais de livraison
 *       - Frais de commissions
 *       - Montant à reverser
 *       - Déjà reversé
 *       - Dépenses totales
 *       - Revenus des abonnements
 *       - Revenu net global
 *     tags:
 *       - Finances
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
 *                 ca_global:
 *                   type: number
 *                   example: 850000
 *                 ca_global_tendance:
 *                   type: number
 *                   example: 18.6
 *                 frais_livraison:
 *                   type: number
 *                   example: 90000
 *                 frais_livraison_tendance:
 *                   type: number
 *                   example: 20
 *                 frais_commissions:
 *                   type: number
 *                   example: 50000
 *                 frais_commissions_tendance:
 *                   type: number
 *                   example: 3
 *                 a_reverser:
 *                   type: number
 *                   example: 25000
 *                 a_reverser_tendance:
 *                   type: number
 *                   example: 5
 *                 deja_reverse:
 *                   type: number
 *                   example: 25000
 *                 deja_reverse_tendance:
 *                   type: number
 *                   example: 3
 *                 depenses_totales:
 *                   type: number
 *                   example: 150000
 *                 depenses_totales_tendance:
 *                   type: number
 *                   example: -17.65
 *                 revenus_abonnes:
 *                   type: number
 *                   example: 150000
 *                 revenus_abonnes_tendance:
 *                   type: number
 *                   example: 3
 *                 revenus_net_global:
 *                   type: number
 *                   example: 750000
 *                 revenus_net_global_tendance:
 *                   type: number
 *                   example: 5
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import Payment from 'src/@apiCore/models/payment'
import Expense from 'src/@apiCore/models/expense'
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

    // 🔧 Filtres
    const currentFilter = { createdAt: { $gte: startDate } }
    const previousFilter = { createdAt: { $gte: previousStartDate, $lt: startDate } }

    // 📊 Calculer tous les KPIs en parallèle
    const [
      currentCA,
      previousCA,
      currentDeliveryFees,
      previousDeliveryFees,
      currentCommissions,
      previousCommissions,
      currentToReverse,
      previousToReverse,
      currentReversed,
      previousReversed,
      currentExpenses,
      previousExpenses,
      currentSubscriptions,
      previousSubscriptions
    ] = await Promise.all([
      // CA Global (commandes livrées)
      Order.aggregate([
        { $match: { ...currentFilter, status: { $in: ['Livrée', 'Terminée'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { ...previousFilter, status: { $in: ['Livrée', 'Terminée'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),

      // Frais de livraison
      Order.aggregate([
        { $match: currentFilter },
        { $group: { _id: null, total: { $sum: '$deliveryFee' } } }
      ]),
      Order.aggregate([
        { $match: previousFilter },
        { $group: { _id: null, total: { $sum: '$deliveryFee' } } }
      ]),

      // Commissions
      Order.aggregate([
        { $match: currentFilter },
        { $group: { _id: null, total: { $sum: '$commission' } } }
      ]),
      Order.aggregate([
        { $match: previousFilter },
        { $group: { _id: null, total: { $sum: '$commission' } } }
      ]),

      // À reverser (paiements en attente)
      Payment.aggregate([
        { $match: { ...currentFilter, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { ...previousFilter, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Déjà reversé
      Payment.aggregate([
        { $match: { ...currentFilter, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { ...previousFilter, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Dépenses totales
      Expense.aggregate([
        { $match: currentFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: previousFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Revenus des abonnements
      Shop.aggregate([
        { $match: { 
          ...currentFilter,
          subscription_date: { $exists: true }
        }},
        { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
        { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
        { $group: { _id: null, total: { $sum: { $ifNull: ['$planInfo.price', 0] } } } }
      ]),
      Shop.aggregate([
        { $match: { 
          ...previousFilter,
          subscription_date: { $exists: true }
        }},
        { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
        { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
        { $group: { _id: null, total: { $sum: { $ifNull: ['$planInfo.price', 0] } } } }
      ])
    ])

    // Extraire les valeurs
    const getValue = (arr) => (arr[0]?.total || 0)
    
    const caGlobal = getValue(currentCA)
    const caGlobalPrev = getValue(previousCA)
    const fraisLivraison = getValue(currentDeliveryFees)
    const fraisLivraisonPrev = getValue(previousDeliveryFees)
    const fraisCommissions = getValue(currentCommissions)
    const fraisCommissionsPrev = getValue(previousCommissions)
    const aReverser = getValue(currentToReverse)
    const aReverserPrev = getValue(previousToReverse)
    const dejaReverse = getValue(currentReversed)
    const dejaReversePrev = getValue(previousReversed)
    const depensesTotales = getValue(currentExpenses)
    const depensesTotalesPrev = getValue(previousExpenses)
    const revenusAbonnes = getValue(currentSubscriptions)
    const revenusAbonnesPrev = getValue(previousSubscriptions)

    // Calculer le revenu net
    const revenusNetGlobal = caGlobal - fraisLivraison - fraisCommissions - depensesTotales
    const revenusNetGlobalPrev = caGlobalPrev - fraisLivraisonPrev - fraisCommissionsPrev - depensesTotalesPrev

    // Calculer les tendances
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0
      return Number((((current - previous) / previous) * 100).toFixed(2))
    }

    return res.status(200).json({
      success: true,
      message: 'KPIs financiers récupérés avec succès',
      data: {
        ca_global: Math.round(caGlobal),
        ca_global_tendance: calculateTrend(caGlobal, caGlobalPrev),
        frais_livraison: Math.round(fraisLivraison),
        frais_livraison_tendance: calculateTrend(fraisLivraison, fraisLivraisonPrev),
        frais_commissions: Math.round(fraisCommissions),
        frais_commissions_tendance: calculateTrend(fraisCommissions, fraisCommissionsPrev),
        a_reverser: Math.round(aReverser),
        a_reverser_tendance: calculateTrend(aReverser, aReverserPrev),
        deja_reverse: Math.round(dejaReverse),
        deja_reverse_tendance: calculateTrend(dejaReverse, dejaReversePrev),
        depenses_totales: Math.round(depensesTotales),
        depenses_totales_tendance: calculateTrend(depensesTotales, depensesTotalesPrev),
        revenus_abonnes: Math.round(revenusAbonnes),
        revenus_abonnes_tendance: calculateTrend(revenusAbonnes, revenusAbonnesPrev),
        revenus_net_global: Math.round(revenusNetGlobal),
        revenus_net_global_tendance: calculateTrend(revenusNetGlobal, revenusNetGlobalPrev)
      }
    })

  } catch (error) {
    console.error('❌ Finances KPIs API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}