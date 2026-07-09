/**
 * @swagger
 * /api/dashboard/finances/alertes:
 *   get:
 *     summary: Alertes financières prioritaires
 *     description: |
 *       Retourne les alertes financières critiques nécessitant une action.
 *       
 *       **Types d'alertes** :
 *       - Transactions bloquées (paiement en attente > 48h)
 *       - Abonnements expirés ou expirant bientôt
 *       - Reversements en retard
 *     tags:
 *       - Finances
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Alertes récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions_bloquees:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 3
 *                     description:
 *                       type: string
 *                       example: Paiement en attente depuis plus de 48h
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           montant:
 *                             type: number
 *                           boutique:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date
 *
 *                 abonnements_expires:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 2
 *                     description:
 *                       type: string
 *                       example: Abonnements expirés dans 3 jours - Relances non envoyées
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           boutique:
 *                             type: string
 *                           date_expiration:
 *                             type: string
 *                             format: date
 *
 *                 reversements_en_retard:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 3
 *                     description:
 *                       type: string
 *                       example: Marchand boutique Alpha
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           boutique:
 *                             type: string
 *                           montant_du:
 *                             type: number
 *                           date_echeance:
 *                             type: string
 *                             format: date
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Payment from 'src/@apiCore/models/payment'
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

    const now = new Date()
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // 🔍 Récupérer les alertes en parallèle
    const [
      transactionsBloquees,
      abonnementsExpires,
      reversementsRetard
    ] = await Promise.all([
      // Transactions bloquées (> 48h en attente)
      Payment.aggregate([
        { $match: { 
          status: 'pending',
          createdAt: { $lt: fortyEightHoursAgo }
        }},
        { $lookup: { from: 'shops', localField: 'shop', foreignField: '_id', as: 'shopInfo' }},
        { $unwind: '$shopInfo' },
        { $project: {
          _id: 1,
          montant: '$amount',
          boutique: '$shopInfo.name',
          date: '$createdAt'
        }},
        { $sort: { date: 1 }},
        { $limit: 10 }
      ]),

      // Abonnements expirés ou expirant dans 3 jours
      Shop.aggregate([
        { $match: {
          expire_date: { $lte: threeDaysFromNow },
          active: true
        }},
        { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
        { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
        { $project: {
          _id: 1,
          boutique: '$name',
          date_expiration: '$expire_date',
          plan: '$planInfo.name'
        }},
        { $sort: { date_expiration: 1 }},
        { $limit: 10 }
      ]),

      // Reversements en retard
      Payment.aggregate([
        { $match: {
          status: 'pending',
          due_date: { $lt: now }
        }},
        { $lookup: { from: 'shops', localField: 'shop', foreignField: '_id', as: 'shopInfo' }},
        { $unwind: '$shopInfo' },
        { $project: {
          _id: 1,
          boutique: '$shopInfo.name',
          montant_du: '$amount',
          date_echeance: '$due_date'
        }},
        { $sort: { date_echeance: 1 }},
        { $limit: 10 }
      ])
    ])

    return res.status(200).json({
      success: true,
      message: 'Alertes financières récupérées avec succès',
      data: {
        transactions_bloquees: {
          count: transactionsBloquees.length,
          description: 'Paiement en attente depuis plus de 48h',
          details: transactionsBloquees.map(t => ({
            id: t._id,
            montant: Math.round(t.montant),
            boutique: t.boutique,
            date: t.date.toISOString().split('T')[0]
          }))
        },
        abonnements_expires: {
          count: abonnementsExpires.length,
          description: 'Abonnements expirés dans 3 jours - Relances non envoyées',
          details: abonnementsExpires.map(a => ({
            id: a._id,
            boutique: a.boutique,
            date_expiration: a.date_expiration.toISOString().split('T')[0]
          }))
        },
        reversements_en_retard: {
          count: reversementsRetard.length,
          description: 'Reversements non effectués après la date d\'échéance',
          details: reversementsRetard.map(r => ({
            id: r._id,
            boutique: r.boutique,
            montant_du: Math.round(r.montant_du),
            date_echeance: r.date_echeance.toISOString().split('T')[0]
          }))
        }
      }
    })

  } catch (error) {
    console.error('❌ Finances Alertes API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}