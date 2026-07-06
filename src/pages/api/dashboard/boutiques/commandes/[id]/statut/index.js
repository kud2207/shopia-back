/**
 * @swagger
 * /api/boutiques/commandes/{id}/statut:
 *   patch:
 *     summary: Modifier le statut d'une commande
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - statut
 *             properties:
 *               statut:
 *                 type: string
 *                 enum: [en_attente, en_cours, livree, non_livree]
 *
 *     responses:
 *       200:
 *         description: Statut mis à jour
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query
    const { statut } = req.body

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID commande invalide' })
    }

    const validStatuses = ['en_attente', 'en_cours', 'livree', 'non_livree']
    if (!statut || !validStatuses.includes(statut)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Statut invalide',
        validStatuses 
      })
    }

    const order = await Order.findById(id)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' })
    }

    const statusMap = {
      'en_attente': 'En attente',
      'en_cours': 'En cours',
      'livree': 'Livrée',
      'non_livree': 'Non livrée'
    }

    order.status = statusMap[statut]
    await order.save()

    return res.status(200).json({
      success: true,
      message: 'Statut mis à jour avec succès',
      data: {
        id: order._id,
        statut: statut,
        updatedAt: order.updatedAt
      }
    })

  } catch (error) {
    console.error('❌ Update Statut API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}