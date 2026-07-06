/**
 * @swagger
 * /api/boutiques/shopbot/stats:
 *   get:
 *     summary: Statistiques globales ShopBot
 *     description: |
 *       Retourne les KPIs globaux de l'assistant IA ShopBot.
 *       
 *       **Métriques** :
 *       - Statut global (actif/inactif/erreur)
 *       - Nombre d'interactions
 *       - Commandes générées
 *       - Taux de conversion
 *     tags:
 *       - ShopBot
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: boutique_id
 *         schema:
 *           type: string
 *         description: Filtrer par boutique (optionnel)
 *
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
 *                     statut_global:
 *                       type: string
 *                       enum: [actif, inactif, erreur]
 *                       example: actif
 *
 *                     interactions:
 *                       type: integer
 *                       example: 1200
 *
 *                     interactions_tendance:
 *                       type: number
 *                       example: 25
 *
 *                     commandes_generees:
 *                       type: integer
 *                       example: 250
 *
 *                     commandes_generees_tendance:
 *                       type: number
 *                       example: 22
 *
 *                     taux_conversion:
 *                       type: number
 *                       example: 30
 *
 *                     taux_conversion_tendance:
 *                       type: number
 *                       example: 5
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import Shop from 'src/@apiCore/models/shop'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { boutique_id, period = 'month' } = req.query

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

    // 🔧 Filtres
    const baseFilter = {
      createdAt: { $gte: startDate },
      source: 'shopbot' // Commandes générées par ShopBot
    }

    const previousFilter = {
      createdAt: { $gte: previousStartDate, $lt: startDate },
      source: 'shopbot'
    }

    if (boutique_id && Types.ObjectId.isValid(boutique_id)) {
      baseFilter.shop = new Types.ObjectId(boutique_id)
      previousFilter.shop = new Types.ObjectId(boutique_id)
    }

    // 📊 Calculer les stats
    const [
      currentInteractions,
      previousInteractions,
      currentOrders,
      previousOrders,
      totalShops
    ] = await Promise.all([
      // Interactions actuelles (simulé - à remplacer par vraie collection)
      1200,
      960,
      Order.countDocuments(baseFilter),
      Order.countDocuments(previousFilter),
      Shop.countDocuments({ shopbotActive: true })
    ])

    // Calculer le taux de conversion
    const conversionRate = currentInteractions > 0 
      ? parseFloat(((currentOrders / currentInteractions) * 100).toFixed(1))
      : 0

    const previousConversionRate = previousInteractions > 0
      ? parseFloat(((previousOrders / previousInteractions) * 100).toFixed(1))
      : 0

    // Calculer les tendances
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0
      return Number((((current - previous) / previous) * 100).toFixed(1))
    }

    // Déterminer le statut global
    let statutGlobal = 'actif'
    if (totalShops === 0) statutGlobal = 'inactif'
    else if (totalShops < 5) statutGlobal = 'erreur'

    return res.status(200).json({
      success: true,
      message: 'Statistiques ShopBot récupérées avec succès',
      data: {
        statut_global: statutGlobal,
        interactions: currentInteractions,
        interactions_tendance: calculateTrend(currentInteractions, previousInteractions),
        commandes_generees: currentOrders,
        commandes_generees_tendance: calculateTrend(currentOrders, previousOrders),
        taux_conversion: conversionRate,
        taux_conversion_tendance: calculateTrend(conversionRate, previousConversionRate)
      }
    })

  } catch (error) {
    console.error('❌ ShopBot Stats API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}