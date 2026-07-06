/**
 * @swagger
 * /api/boutiques/commandes/{id}/annuler:
 *   post:
 *     summary: Annuler une commande
 *     tags:
 *       - Boutiques
 *     security:
 *       - bearerAuth: []
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query
    const { motif } = req.body

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID commande invalide' })
    }

    if (!motif || motif.length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Motif requis (minimum 10 caractères)' 
      })
    }

    const order = await Order.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' })
    }

    if (order.status === 'Annulée') {
      return res.status(400).json({ success: false, message: 'Commande déjà annulée' })
    }

    if (order.status === 'Livrée') {
      return res.status(400).json({ success: false, message: 'Impossible d\'annuler une commande livrée' })
    }

    order.status = 'Annulée'
    order.cancellationReason = motif
    order.cancelledAt = new Date()
    order.cancelledBy = auth.admin._id
    await order.save()

    return res.status(200).json({
      success: true,
      message: 'Commande annulée avec succès',
      data: {
        id: order._id,
        statut: 'Annulée',
        motif: order.cancellationReason,
        annuleeLe: order.cancelledAt
      }
    })

  } catch (error) {
    console.error('❌ Cancel Order API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}