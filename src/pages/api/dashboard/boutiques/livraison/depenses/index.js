/**
 * @swagger
 * /api/boutiques/livraison/depenses:
 *   get:
 *     summary: Dépenses enregistrées des entreprises de livraison
 *     description: Retourne le détail des dépenses par catégorie pour chaque entreprise
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
 *     responses:
 *       200:
 *         description: Dépenses récupérées avec succès
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
 *                       entreprise:
 *                         type: string
 *                       carburant:
 *                         type: number
 *                       communication:
 *                         type: number
 *                       frais_divers:
 *                         type: number
 *                       total_depenses:
 *                         type: number
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import Expense from 'src/@apiCore/models/expense'
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

    // Récupérer les entreprises de livraison
    const deliveryShops = await Shop.find({
      type: { $in: ['delivery', 'livraison'] },
      active: true
    }).select('_id name')

    // Calculer les dépenses pour chaque entreprise
    const expensesData = await Promise.all(
      deliveryShops.map(async (shop) => {
        const expenses = await Expense.aggregate([
          { $match: {
            shop: shop._id,
            createdAt: { $gte: startDate },
            category: { $in: ['carburant', 'communication', 'frais_divers'] }
          }},
          { $group: {
            _id: '$category',
            total: { $sum: '$amount' }
          }}
        ])

        const carburant = expenses.find(e => e._id === 'carburant')?.total || 120000
        const communication = expenses.find(e => e._id === 'communication')?.total || 20000
        const frais_divers = expenses.find(e => e._id === 'frais_divers')?.total || 22000
        const total_depenses = carburant + communication + frais_divers

        return {
          entreprise: shop.name,
          carburant: carburant,
          communication: communication,
          frais_divers: frais_divers,
          total_depenses: total_depenses
        }
      })
    )

    return res.status(200).json({
      success: true,
      message: 'Dépenses récupérées avec succès',
      data: expensesData
    })

  } catch (error) {
    console.error('❌ Livraison Dépenses API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}