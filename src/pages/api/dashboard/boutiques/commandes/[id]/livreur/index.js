/**
 * @swagger
 * /api/boutiques/commandes/{id}/livreur:
 *   get:
 *     summary: Liste des livreurs disponibles
 *     tags:
 *       - Boutiques
 *     security:
 *       - bearerAuth: []
 *   patch:
 *     summary: Changer le livreur d'une commande
 *     tags:
 *       - Boutiques
 *     security:
 *       - bearerAuth: []
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import User from 'src/@apiCore/models/user'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    // GET : Liste des livreurs
    if (req.method === 'GET') {
      const livreurs = await User.find({
        role: 'livreur',
        active: true
      }).select('name email phone')
        .sort({ name: 1 })

      return res.status(200).json({
        success: true,
        data: livreurs
      })
    }

    // PATCH : Mettre à jour le livreur
    if (req.method === 'PATCH') {
      const { livreur_id } = req.body

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID commande invalide' })
      }

      if (!livreur_id || !Types.ObjectId.isValid(livreur_id)) {
        return res.status(400).json({ success: false, message: 'ID livreur invalide' })
      }

      const livreur = await User.findById(livreur_id)
      if (!livreur || livreur.role !== 'livreur' || !livreur.active) {
        return res.status(404).json({ success: false, message: 'Livreur non trouvé' })
      }

      const order = await Order.findById(id)
      if (!order) {
        return res.status(404).json({ success: false, message: 'Commande non trouvée' })
      }

      order.deliveryCompany = livreur_id
      await order.save()

      return res.status(200).json({
        success: true,
        message: 'Livreur mis à jour avec succès',
        data: {
          id: order._id,
          livreur: {
            id: livreur._id,
            nom: livreur.name
          }
        }
      })
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Update Livreur API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}