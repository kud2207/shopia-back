/**
 * @swagger
 * /api/dashboard/finances/rapports/services-livraison:
 *   get:
 *     summary: Rapport services de livraison
 *     description: |
 *       Retourne les performances financières des entreprises de livraison.
 *       
 *       **Métriques par service** :
 *       - Commandes assignées
 *       - Montants collectés
 *       - Commissions enregistrées
 *       - Montant reversé aux marchands
 *       - Dépenses
 *     tags:
 *       - Finances - Rapports Financiers
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
 *         description: Rapport services livraison récupéré avec succès
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
 *                           service_livraison:
 *                             type: string
 *                           commandes_assignees:
 *                             type: number
 *                           montant_collectes:
 *                             type: number
 *                           commissions_enregistrees:
 *                             type: number
 *                           montant_reverse_marchands:
 *                             type: number
 *                           depenses:
 *                             type: number
 *                     pagination:
 *                       type: object
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import Order from 'src/@apiCore/models/order'
import Expense from 'src/@apiCore/models/expense'
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

    // 🔧 Filtrer les services de livraison
    const deliveryFilter = {
      type: { $in: ['delivery', 'livraison'] },
      active: true
    }

    // Récupérer les services
    const deliveryServices = await Shop.find(deliveryFilter)
      .sort({ name: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    const total = await Shop.countDocuments(deliveryFilter)

    // Calculer les stats pour chaque service
    const servicesData = await Promise.all(
      deliveryServices.map(async (service) => {
        const orderStats = await Order.aggregate([
          { $match: { 
            deliveryCompany: service._id,
            createdAt: { $gte: startDate }
          }},
          { $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            montantCollecte: { $sum: '$total' },
            commissions: { $sum: '$commission' }
          }}
        ])

        const stats = orderStats[0] || { 
          totalOrders: 0, 
          montantCollecte: 0, 
          commissions: 0 
        }

        // Dépenses du service
        const expenses = await Expense.aggregate([
          { $match: {
            shop: service._id,
            createdAt: { $gte: startDate }
          }},
          { $group: {
            _id: null,
            total: { $sum: '$amount' }
          }}
        ])

        const expensesTotal = expenses[0]?.total || 0

        // Montant reversé = Collecte - Commissions - Dépenses
        const montantReverse = stats.montantCollecte - stats.commissions - expensesTotal

        return {
          id: service._id,
          service_livraison: service.name,
          commandes_assignees: Math.round(stats.montantCollecte), // Ou nombre de commandes
          montant_collectes: Math.round(stats.montantCollecte),
          commissions_enregistrees: Math.round(stats.commissions),
          montant_reverse_marchands: Math.round(montantReverse),
          depenses: Math.round(expensesTotal)
        }
      })
    )

    return res.status(200).json({
      success: true,
      message: 'Rapport services de livraison récupéré avec succès',
      data: {
        data: servicesData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }
    })

  } catch (error) {
    console.error('❌ Rapport Livraison API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}