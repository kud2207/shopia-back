/**
 * @swagger
 * /api/boutiques/livraison/incidents:
 *   get:
 *     summary: Incidents de livraison - Commandes non livrées
 *     description: Liste des commandes non livrées avec les motifs
 *     tags:
 *       - Boutiques - Livraison
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par ID commande ou boutique
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
 *         description: Incidents récupérés avec succès
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
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_commande:
 *                             type: string
 *                           boutique_partenaire:
 *                             type: string
 *                           livreur:
 *                             type: string
 *                           motif:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import Shop from 'src/@apiCore/models/shop'
import User from 'src/@apiCore/models/user'
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

    const { period = 'month', search = '', page = 1, limit = 20 } = req.query

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
      status: { $in: ['Non livrée', 'Annulée'] },
      createdAt: { $gte: startDate }
    }

    if (search) {
      baseFilter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shopInfo.name': { $regex: search, $options: 'i' } }
      ]
    }

    // Récupérer les incidents
    const incidents = await Order.aggregate([
      { $lookup: { from: 'shops', localField: 'shop', foreignField: '_id', as: 'shopInfo' } },
      { $unwind: '$shopInfo' },
      { $lookup: { from: 'users', localField: 'deliveryCompany', foreignField: '_id', as: 'deliveryInfo' } },
      { $unwind: { path: '$deliveryInfo', preserveNullAndEmptyArrays: true } },
      { $match: baseFilter },
      { $sort: { createdAt: -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) }
    ])

    const total = await Order.aggregate([
      { $lookup: { from: 'shops', localField: 'shop', foreignField: '_id', as: 'shopInfo' } },
      { $unwind: '$shopInfo' },
      { $match: baseFilter },
      { $count: 'total' }
    ])

    // Formater les incidents
    const formattedIncidents = incidents.map(order => ({
      id_commande: order.orderNumber || `CMD-${order._id.toString().slice(-6).toUpperCase()}`,
      boutique_partenaire: order.shopInfo?.name || 'Inconnue',
      livreur: order.deliveryInfo?.name || 'Non assigné',
      motif: order.cancellationReason || order.deliveryFailureReason || 'Motif non spécifié',
      date: order.createdAt.toISOString().split('T')[0]
    }))

    const totalCount = total[0]?.total || 0

    return res.status(200).json({
      success: true,
      message: 'Incidents récupérés avec succès',
      data: {
        data: formattedIncidents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          total_pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    })

  } catch (error) {
    console.error('❌ Livraison Incidents API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}