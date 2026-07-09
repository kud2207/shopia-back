/**
 * @swagger
 * /api/dashboard/finances/revenus-par-module:
 *   get:
 *     summary: Revenus par module (graphique)
 *     description: |
 *       Retourne les séries temporelles des revenus par type de boutique.
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
 *                       marchands:
 *                         type: number
 *                       livraison:
 *                         type: number
 *                       prestataires:
 *                         type: number
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
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

    // 📊 Agrégation par type de boutique
    const revenues = await Order.aggregate([
      { $lookup: { from: 'shops', localField: 'shop', foreignField: '_id', as: 'shopInfo' }},
      { $unwind: '$shopInfo' },
      { $match: { 
        createdAt: { $gte: startDate },
        status: { $in: ['Livrée', 'Terminée'] }
      }},
      { $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          shopType: { $ifNull: ['$shopInfo.type', 'product'] }
        },
        total: { $sum: '$total' }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }}
    ])

    // 📅 Générer les labels de période
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

    // ️ Organiser les données par période et type
    const dataMap = {}
    labels.forEach(label => {
      dataMap[label] = { marchands: 0, livraison: 0, prestataires: 0 }
    })

    revenues.forEach(item => {
      const date = new Date(item._id.year, item._id.month - 1, item._id.day || 1)
      const label = groupByMonth 
        ? date.toLocaleString('fr-FR', { month: 'long' })
        : date.toLocaleString('fr-FR', { day: '2-digit', month: 'short' })

      const type = item._id.shopType
      if (['product', 'marchand', 'ecommerce'].includes(type)) {
        dataMap[label].marchands += item.total
      } else if (['delivery', 'livraison'].includes(type)) {
        dataMap[label].livraison += item.total
      } else if (['service', 'prestataire'].includes(type)) {
        dataMap[label].prestataires += item.total
      }
    })

    // 📤 Formater la réponse
    const data = Object.entries(dataMap).map(([mois, values]) => ({
      mois,
      marchands: Math.round(values.marchands),
      livraison: Math.round(values.livraison),
      prestataires: Math.round(values.prestataires)
    }))

    return res.status(200).json({
      success: true,
      message: 'Revenus par module récupérés avec succès',
      data
    })

  } catch (error) {
    console.error('❌ Revenus par module API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}