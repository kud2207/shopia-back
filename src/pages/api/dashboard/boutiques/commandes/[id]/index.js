/**
 * @swagger
 * /api/boutiques/commandes/{id}/stats:
 *   get:
 *     summary: Stats détaillées d'une commande
 *     tags:
 *       - Boutiques
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *
 *     responses:
 *       200:
 *         description: Stats de la commande
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
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

    const { id } = req.query

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID commande invalide' })
    }

    const order = await Order.findById(id)
      .populate('shop', 'name')
      .populate('user', 'name email phone')
      .populate('deliveryCompany', 'name')

    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' })
    }

    return res.status(200).json({
      success: true,
      data: {
        id: order._id,
        boutique: order.shop?.name,
        client: order.user?.name,
        montant: order.total,
        statut: order.status,
        service_livraison: order.deliveryCompany?.name,
        date: order.createdAt
      }
    })

  } catch (error) {
    console.error('❌ Commande Stats API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}