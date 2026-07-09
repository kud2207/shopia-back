/**
 * @swagger
 * /api/dashboard/finances/rapports/global:
 *   get:
 *     summary: Rapport global plateforme
 *     description: |
 *       Retourne les KPIs financiers globaux et la liste des transactions.
 *       
 *       **KPIs** :
 *       - Commandes totales
 *       - Chiffre d'affaires
 *       - Commissions
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
 *           enum: [day, month, quarter, custom]
 *           default: month
 *         description: Période du rapport
 *
 *       - in: query
 *         name: date_debut
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début (si period=custom)
 *
 *       - in: query
 *         name: date_fin
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin (si period=custom)
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
 *         description: Rapport global récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 kpis:
 *                   type: object
 *                   properties:
 *                     commandes_totales:
 *                       type: integer
 *                     commandes_totales_tendance:
 *                       type: number
 *                     chiffre_affaire:
 *                       type: number
 *                     chiffre_affaire_tendance:
 *                       type: number
 *                     commissions:
 *                       type: number
 *                     commissions_tendance:
 *                       type: number
 *                     depenses:
 *                       type: number
 *                     depenses_tendance:
 *                       type: number
 *                 transactions:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date
 *                           type:
 *                             type: string
 *                             enum: [vente, commission, depense]
 *                           description:
 *                             type: string
 *                           montant:
 *                             type: number
 *                           statut:
 *                             type: string
 *                             enum: [valide, en_attente, debite]
 *                     pagination:
 *                       type: object
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import Payment from 'src/@apiCore/models/payment'
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
      date_debut, 
      date_fin,
      page = 1, 
      limit = 20 
    } = req.query

    // 📅 Calculer les périodes
    const now = new Date()
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    let endDate = now
    let previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    if (period === 'custom' && date_debut && date_fin) {
      startDate = new Date(date_debut)
      endDate = new Date(date_fin)
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      previousStartDate = new Date(startDate.getTime() - daysDiff * 24 * 60 * 60 * 1000)
    } else if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
    }

    //  Filtres
    const currentFilter = { 
      createdAt: { $gte: startDate, $lte: endDate } 
    }
    const previousFilter = { 
      createdAt: { $gte: previousStartDate, $lt: startDate } 
    }

    //  Calculer les KPIs en parallèle
    const [
      currentOrders,
      previousOrders,
      currentCA,
      previousCA,
      currentCommissions,
      previousCommissions,
      currentExpenses,
      previousExpenses,
      transactions
    ] = await Promise.all([
      // Commandes totales
      Order.countDocuments(currentFilter),
      Order.countDocuments(previousFilter),
      // CA
      Order.aggregate([
        { $match: { ...currentFilter, status: { $in: ['Livrée', 'Terminée'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { ...previousFilter, status: { $in: ['Livrée', 'Terminée'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
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
      // Dépenses
      Expense.aggregate([
        { $match: currentFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: previousFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Transactions (ventes, commissions, dépenses)
      getTransactions(currentFilter, parseInt(page), parseInt(limit))
    ])

    const getValue = (arr) => (arr[0]?.total || 0)
    
    const caCurrent = getValue(currentCA)
    const caPrevious = getValue(previousCA)
    const commissionsCurrent = getValue(currentCommissions)
    const commissionsPrevious = getValue(previousCommissions)
    const expensesCurrent = getValue(currentExpenses)
    const expensesPrevious = getValue(previousExpenses)

    // Calculer les tendances
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0
      return Number((((current - previous) / previous) * 100).toFixed(2))
    }

    return res.status(200).json({
      success: true,
      message: 'Rapport global récupéré avec succès',
      kpis: {
        commandes_totales: currentOrders,
        commandes_totales_tendance: calculateTrend(currentOrders, previousOrders),
        chiffre_affaire: Math.round(caCurrent),
        chiffre_affaire_tendance: calculateTrend(caCurrent, caPrevious),
        commissions: Math.round(commissionsCurrent),
        commissions_tendance: calculateTrend(commissionsCurrent, commissionsPrevious),
        depenses: Math.round(expensesCurrent),
        depenses_tendance: calculateTrend(expensesCurrent, expensesPrevious)
      },
      transactions: {
        data: transactions.data,
        pagination: transactions.pagination
      },
      periode: {
        debut: startDate.toISOString().split('T')[0],
        fin: endDate.toISOString().split('T')[0]
      }
    })

  } catch (error) {
    console.error('❌ Rapport Global API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// Helper pour récupérer les transactions
async function getTransactions(filter, page, limit) {
  const [orders, expenses] = await Promise.all([
    Order.find(filter)
      .populate('shop', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit),
    Expense.find(filter)
      .populate('shop', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
  ])

  // Formater les transactions
  const transactions = []

  orders.forEach(order => {
    // Transaction de vente
    transactions.push({
      id: order._id,
      date: order.createdAt.toISOString().split('T')[0],
      type: 'vente',
      description: `Commande-${order._id.toString().slice(-6).toUpperCase()}`,
      montant: order.total,
      statut: order.status === 'Livrée' ? 'valide' : 'en_attente'
    })

    // Transaction de commission
    if (order.commission > 0) {
      transactions.push({
        id: `${order._id}-commission`,
        date: order.createdAt.toISOString().split('T')[0],
        type: 'commission',
        description: `Commission-${order._id.toString().slice(-6).toUpperCase()}`,
        montant: order.commission,
        statut: 'valide'
      })
    }
  })

  expenses.forEach(expense => {
    transactions.push({
      id: expense._id,
      date: expense.createdAt.toISOString().split('T')[0],
      type: 'depense',
      description: expense.description || 'Dépense diverse',
      montant: expense.amount,
      statut: 'debite'
    })
  })

  // Trier par date
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date))

  const total = await Promise.all([
    Order.countDocuments(filter),
    Expense.countDocuments(filter)
  ]).then(([ordersCount, expensesCount]) => ordersCount * 2 + expensesCount)

  return {
    data: transactions.slice(0, limit),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  }
}