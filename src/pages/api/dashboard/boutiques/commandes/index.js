/**
 * @swagger
 * /api/boutiques/commandes:
 *   get:
 *     summary: Liste de toutes les commandes
 *     description: Liste paginée des commandes de toutes les boutiques
 *     tags:
 *       - Boutiques
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, en_attente, en_cours, livree, non_livree]
 *           default: all
 *
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *           default: month
 *
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: Commandes récupérées
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import Shop from 'src/@apiCore/models/shop'
import User from 'src/@apiCore/models/user'
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

    const { 
      boutique_id,
      status = 'all', 
      period = 'month', 
      search = '', 
      page = 1, 
      limit = 20 
    } = req.query

    // 📅 Calculer la période
    const now = new Date()
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1)

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      startDate = weekAgo
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
    }

    // 🔧 Construire les filtres
    const baseFilter = {
      createdAt: { $gte: startDate }
    }

    // Filtrer par boutique si spécifié
    if (boutique_id && Types.ObjectId.isValid(boutique_id)) {
      baseFilter.shop = new Types.ObjectId(boutique_id)
    }

    if (status !== 'all') {
      baseFilter.status = status
    }

    if (search) {
      baseFilter.$or = [
        { 'client.name': { $regex: search, $options: 'i' } },
        { _id: { $regex: search, $options: 'i' } }
      ]
    }

    // 📊 Stats de répartition + Liste
    const [repartition, orders, total] = await Promise.all([
      Order.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.find(baseFilter)
        .populate('shop', 'name')
        .populate('user', 'name email')
        .populate('deliveryCompany', 'name')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Order.countDocuments(baseFilter)
    ])

    // Formater la répartition
    const repartitionFormatted = {
      en_cours: 0,
      livree: 0,
      en_attente: 0,
      non_livree: 0
    }

    repartition.forEach(item => {
      if (item._id === 'En cours') repartitionFormatted.en_cours = item.count
      else if (item._id === 'Livrée') repartitionFormatted.livree = item.count
      else if (item._id === 'En attente') repartitionFormatted.en_attente = item.count
      else if (item._id === 'Non livrée') repartitionFormatted.non_livree = item.count
    })

    // Formater les commandes
    const formattedOrders = orders.map(order => ({
      id: order._id,
      boutique: order.shop?.name || 'Inconnue',
      client: order.user?.name || order.client?.name || 'Client inconnu',
      montant: order.total || 0,
      service_livraison: order.deliveryCompany?.name || 'Non assigné',
      statut: order.status,
      date: order.createdAt.toISOString().split('T')[0]
    }))

    return res.status(200).json({
      success: true,
      message: 'Commandes récupérées avec succès',
      data: {
        total,
        repartition: repartitionFormatted,
        data: formattedOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }
    })

  } catch (error) {
    console.error('❌ Boutiques Commandes API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}