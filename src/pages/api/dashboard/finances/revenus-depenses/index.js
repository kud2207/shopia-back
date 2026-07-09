/**
 * @swagger
 * /api/dashboard/finances/revenus-depenses:
 *   get:
 *     summary: Revenus vs Dépenses (graphique)
 *     description: |
 *       Retourne les séries temporelles comparant revenus et dépenses.
 *       
 *       **Périodes disponibles** :
 *       - `3j` : 3 derniers jours
 *       - `2w` : 2 dernières semaines
 *       - `2mois` : 2 derniers mois
 *       - `3mois` : 3 derniers mois
 *       - `4mois` : 4 derniers mois (défaut)
 *       - `6mois` : 6 derniers mois
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
 *           enum: [3j, 2w, 2mois, 3mois, 4mois, 6mois]
 *           default: 4mois
 *         description: Période à afficher
 *
 *     responses:
 *       200:
 *         description: Données récupérées avec succès
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
 *                       mois:
 *                         type: string
 *                       revenus:
 *                         type: number
 *                       depenses:
 *                         type: number
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
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

    const { period = '4mois' } = req.query

    // 📅 Calculer la période
    const now = new Date()
    let startDate = new Date(now.getFullYear(), now.getMonth() - 4, 1)
    let groupByMonth = true

    if (period === '3j') {
      startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      groupByMonth = false
    } else if (period === '2w') {
      startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      groupByMonth = false
    } else if (period === '2mois') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    } else if (period === '3mois') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    } else if (period === '6mois') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    }

    // 📊 Récupérer revenus et dépenses en parallèle
    const [revenuesData, expensesData] = await Promise.all([
      // Revenus (commandes livrées)
      Order.aggregate([
        { $match: { 
          createdAt: { $gte: startDate },
          status: { $in: ['Livrée', 'Terminée'] }
        }},
        { $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          total: { $sum: '$total' }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }}
      ]),

      // Dépenses
      Expense.aggregate([
        { $match: { createdAt: { $gte: startDate } }},
        { $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          total: { $sum: '$amount' }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }}
      ])
    ])

    // 📅 Générer les labels
    const labels = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= now) {
      if (groupByMonth) {
        labels.push(currentDate.toLocaleString('fr-FR', { month: 'long' }))
        currentDate.setMonth(currentDate.getMonth() + 1)
      } else {
        labels.push(currentDate.toLocaleString('fr-FR', { day: '2-digit', month: 'short' }))
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    // 🗂️ Organiser les données
    const dataMap = {}
    labels.forEach(label => {
      dataMap[label] = { revenus: 0, depenses: 0 }
    })

    revenuesData.forEach(item => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day || 1)
      const label = groupByMonth 
        ? date.toLocaleString('fr-FR', { month: 'long' })
        : date.toLocaleString('fr-FR', { day: '2-digit', month: 'short' })
      dataMap[label].revenus += item.total
    })

    expensesData.forEach(item => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day || 1)
      const label = groupByMonth 
        ? date.toLocaleString('fr-FR', { month: 'long' })
        : date.toLocaleString('fr-FR', { day: '2-digit', month: 'short' })
      dataMap[label].depenses += item.total
    })

    // 📤 Formater la réponse (pourcentages pour le graphique)
    const maxValue = Math.max(
      ...Object.values(dataMap).map(d => Math.max(d.revenus, d.depenses))
    ) || 1

    const data = Object.entries(dataMap).map(([mois, values]) => ({
      mois,
      revenus: Math.round((values.revenus / maxValue) * 100),
      depenses: Math.round((values.depenses / maxValue) * 100)
    }))

    return res.status(200).json({
      success: true,
      message: 'Revenus vs Dépenses récupérés avec succès',
      data
    })

  } catch (error) {
    console.error('❌ Revenus vs Dépenses API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}