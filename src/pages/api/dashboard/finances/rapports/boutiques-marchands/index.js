/**
 * @swagger
 * /api/dashboard/finances/rapports/boutiques-marchands:
 *   get:
 *     summary: Rapport boutiques marchands
 *     description: |
 *       Retourne les performances financières détaillées par boutique marchand.
 *       
 *       **Métriques par boutique** :
 *       - Ventes totales
 *       - Livraisons réussies
 *       - Frais de livraison
 *       - Revenu net marchand
 *     tags:
 *       - Finances - Rapports Financiers
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom de boutique
 *
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
 *         description: Rapport boutiques récupéré avec succès
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
 *                           id:
 *                             type: string
 *                           boutique:
 *                             type: string
 *                           ventes_totales:
 *                             type: number
 *                           livraisons_reussies:
 *                             type: integer
 *                           livraisons_totales:
 *                             type: integer
 *                           taux_livraison:
 *                             type: number
 *                           frais_livraison:
 *                             type: string
 *                           revenu_net_marchand:
 *                             type: number
 *                     pagination:
 *                       type: object
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
      roles: ['super_admin', 'admin_financier'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { 
      search = '', 
      period = 'month',
      page = 1, 
      limit = 20 
    } = req.query

    // 📅 Calculer la période
    const now = new Date()
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1)

    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
    }

    // 🔧 Filtrer les boutiques marchands
    const shopFilter = {
      type: { $in: ['product', 'marchand', 'ecommerce'] },
      active: true
    }

    if (search) {
      shopFilter.name = { $regex: search, $options: 'i' }
    }

    // Récupérer les boutiques
    const shops = await Shop.find(shopFilter)
      .sort({ name: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    const total = await Shop.countDocuments(shopFilter)

    // Calculer les stats pour chaque boutique
    const shopsData = await Promise.all(
      shops.map(async (shop) => {
        const orderStats = await Order.aggregate([
          { $match: { 
            shop: shop._id,
            createdAt: { $gte: startDate }
          }},
          { $group: {
            _id: null,
            totalVentes: { $sum: '$total' },
            totalOrders: { $sum: 1 },
            livrees: { $sum: { $cond: [{ $eq: ['$status', 'Livrée'] }, 1, 0] } },
            totalFraisLivraison: { $sum: '$deliveryFee' },
            totalCommissions: { $sum: '$commission' }
          }}
        ])

        const stats = orderStats[0] || { 
          totalVentes: 0, 
          totalOrders: 0, 
          livrees: 0, 
          totalFraisLivraison: 0,
          totalCommissions: 0
        }

        const tauxLivraison = stats.totalOrders > 0
          ? parseFloat(((stats.livrees / stats.totalOrders) * 100).toFixed(1))
          : 0

        // Revenu net = Ventes - Frais livraison - Commissions
        const revenuNet = stats.totalVentes - stats.totalFraisLivraison - stats.totalCommissions

        return {
          id: shop._id,
          boutique: shop.name,
          ventes_totales: Math.round(stats.totalVentes),
          livraisons_reussies: stats.livrees,
          livraisons_totales: stats.totalOrders,
          taux_livraison: tauxLivraison,
          frais_livraison: 'Speed delivery', // À remplacer par vraie donnée
          revenu_net_marchand: Math.round(revenuNet)
        }
      })
    )

    return res.status(200).json({
      success: true,
      message: 'Rapport boutiques marchands récupéré avec succès',
      data: {
        data: shopsData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }
    })

  } catch (error) {
    console.error('❌ Rapport Boutiques API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}