/**
 * @swagger
 * /api/boutiques/produits/stock-assigne/performants:
 *   get:
 *     summary: Produits performants
 *     description: |
 *       Retourne les produits les plus vendus triés par volume de vente.
 *       
 *       **Périodes disponibles** :
 *       - `today` : Aujourd'hui
 *       - `week` : Cette semaine
 *       - `month` : Ce mois (défaut)
 *       - `year` : Cette année
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
 *
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *           default: month
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *
 *     responses:
 *       200:
 *         description: Produits performants récupérés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rang:
 *                         type: integer
 *                       produit:
 *                         type: string
 *                       ventes:
 *                         type: integer
 *                       pourcentage:
 *                         type: number
 *                       revenu:
 *                         type: number
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import Product from 'src/@apiCore/models/product'
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

    const { boutique_id, period = 'month', limit = 10 } = req.query

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
      createdAt: { $gte: startDate },
      status: { $in: ['Livrée', 'Terminée'] }
    }

    if (boutique_id && Types.ObjectId.isValid(boutique_id)) {
      baseFilter.shop = new Types.ObjectId(boutique_id)
    }

    // Agrégation pour obtenir les produits les plus vendus
    const topProducts = await Order.aggregate([
      { $match: baseFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalVentes: { $sum: '$items.quantity' },
          totalRevenu: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          boutique: { $first: '$shop' }
        }
      },
      { $sort: { totalVentes: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' }
    ])

    // Calculer le total des ventes pour le pourcentage
    const totalVentesGlobal = topProducts.reduce((sum, p) => sum + p.totalVentes, 0) || 1

    // Formater les résultats
    const formattedData = topProducts.map((item, index) => ({
      rang: index + 1,
      produit: item.productInfo.name,
      ventes: item.totalVentes,
      pourcentage: parseFloat(((item.totalVentes / totalVentesGlobal) * 100).toFixed(1)),
      revenu: Math.round(item.totalRevenu)
    }))

    return res.status(200).json({
      success: true,
      message: 'Produits performants récupérés avec succès',
      data: formattedData
    })

  } catch (error) {
    console.error('❌ Produits Performants API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}