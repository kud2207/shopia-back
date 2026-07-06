/**
 * @swagger
 * /api/dashboard/stats-dashboard/kpis:
 *   get:
 *     summary: Récupérer les KPIs du dashboard
 *     description: |
 *       Retourne tous les indicateurs clés de performance (KPIs) avec leurs tendances.
 *       
 *       **Période de calcul** : Mois en cours vs Mois précédent
 *     tags:
 *       - stats-dashboard
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
 *
 *                 message:
 *                   type: string
 *                   example: KPIs récupérés avec succès
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     abonnes_actifs:
 *                       type: integer
 *                       description: Nombre total d'abonnés actifs
 *                       example: 33945
 *
 *                     abonnes_actifs_tendance:
 *                       type: number
 *                       description: Pourcentage d'évolution vs mois précédent
 *                       example: 1.1
 *
 *                     nouvelles_inscriptions:
 *                       type: integer
 *                       description: Nouvelles inscriptions ce mois
 *                       example: 353
 *
 *                     nouvelles_inscriptions_tendance:
 *                       type: number
 *                       description: Pourcentage d'évolution vs mois précédent
 *                       example: -33.4
 *
 *                     boutiques_actives:
 *                       type: integer
 *                       description: Nombre total de boutiques actives
 *                       example: 8
 *
 *                     commandes_traitees:
 *                       type: integer
 *                       description: Nombre de commandes ce mois
 *                       example: 293
 *
 *                     commandes_traitees_tendance:
 *                       type: number
 *                       description: Pourcentage d'évolution vs mois précédent
 *                       example: -35.3
 *
 *                     ca_global:
 *                       type: integer
 *                       description: Chiffre d'affaires global (arrondi)
 *                       example: 0
 *
 *                     transactions_attente:
 *                       type: integer
 *                       description: Paiements en statut "Processing"
 *                       example: 0
 *
 *                     tickets_ouverts:
 *                       type: integer
 *                       description: Tickets avec statut "open" ou "in_progress"
 *                       example: 0
 *
 *                     taux_livraison_reussie:
 *                       type: number
 *                       description: Pourcentage de commandes livrées avec succès
 *                       example: 0
 *
 *                     ca_abonnements:
 *                       type: integer
 *                       description: Revenus des abonnements ce mois (arrondi)
 *                       example: 1609
 *
 *       401:
 *         description: Token d'authentification requis ou invalide
 *
 *       405:
 *         description: Méthode non autorisée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Méthode non autorisée
 *
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Erreur serveur
 *                 error:
 *                   type: string
 *                   example: Détails de l'erreur
 */


import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'
import Shop from 'src/@apiCore/models/shop'
import Order from 'src/@apiCore/models/order'
import Payment from 'src/@apiCore/models/payment'
import Ticket from 'src/@apiCore/models/ticket'

const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    console.log('🔌 Connexion MongoDB')
    await dbConnect()
    console.log('✅ MongoDB connecté')

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())

    // 🚀 Requêtes en parallèle
    const [
      currentUsers, previousUsers,
      newUsers, previousNewUsers,
      currentOrders, previousOrders,
      currentPayments, currentTickets,
      currentCA, currentShops,
      currentDelivery, currentSubscriptions
    ] = await Promise.all([
      // Abonnés actifs
      User.countDocuments({ active: true, createdAt: { $lt: today } }),
      User.countDocuments({ active: true, createdAt: { $lt: lastMonth } }),
      // Nouvelles inscriptions
      User.countDocuments({ createdAt: { $gte: lastMonth, $lt: today } }),
      User.countDocuments({ createdAt: { $gte: twoMonthsAgo, $lt: lastMonth } }),
      // Commandes
      Order.countDocuments({ createdAt: { $gte: lastMonth, $lt: today } }),
      Order.countDocuments({ createdAt: { $gte: twoMonthsAgo, $lt: lastMonth } }),
      // Paiements en attente
      Payment.countDocuments({ status: 'Processing', createdAt: { $gte: lastMonth, $lt: today } }),
      // Tickets ouverts
      Ticket.countDocuments({ 
        status: { $in: ['open', 'in_progress'] }, 
        createdAt: { $gte: lastMonth, $lt: today } 
      }),
      // CA Global
      Order.aggregate([
        { $match: { 
          createdAt: { $gte: lastMonth, $lt: today },
          status: { $in: ['Livrée', 'Terminée', 'En cours'] }
        }},
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total', 0] } } } }
      ]),
      // Boutiques actives
      Shop.countDocuments({ active: true, isDelete: false }),
      // Taux de livraison
      Order.aggregate([
        { $match: { 
          createdAt: { $gte: lastMonth, $lt: today },
          status: { $in: ['Livrée', 'Non livrée', 'Annulée'] }
        }},
        { $group: { 
          _id: null, 
          total: { $sum: 1 },
          livrees: { $sum: { $cond: [{ $eq: ['$status', 'Livrée'] }, 1, 0] } }
        }}
      ]),
      // CA Abonnements
      User.aggregate([
        { $match: { 
          plan: { $exists: true },
          subscription_date: { $gte: lastMonth, $lt: today }
        }},
        { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
        { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
        { $group: { _id: null, total: { $sum: { $ifNull: ['$planInfo.price', 0] } } } }
      ])
    ])

    const delivery = currentDelivery[0]

    const response = {
      abonnes_actifs: currentUsers,
      abonnes_actifs_tendance: calculateTrend(currentUsers, previousUsers),
      nouvelles_inscriptions: newUsers,
      nouvelles_inscriptions_tendance: calculateTrend(newUsers, previousNewUsers),
      boutiques_actives: currentShops,
      commandes_traitees: currentOrders,
      commandes_traitees_tendance: calculateTrend(currentOrders, previousOrders),
      ca_global: Math.round(currentCA[0]?.total || 0),
      transactions_attente: currentPayments,
      tickets_ouverts: currentTickets,
      taux_livraison_reussie: delivery?.total 
        ? Number((delivery.livrees / delivery.total * 100).toFixed(1)) 
        : 0,
      ca_abonnements: Math.round(currentSubscriptions[0]?.total || 0)
    }

    console.log('🚀 JSON envoyé')

    return res.status(200).json({
      success: true,
      message: 'KPIs récupérés avec succès',
      data: response
    })

  } catch (error) {
    console.error('❌ API ERROR', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}