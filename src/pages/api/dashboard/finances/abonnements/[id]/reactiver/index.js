/**
 * @swagger
 * /api/dashboard/finances/abonnements/{id}/reactiver:
 *   post:
 *     summary: Réactiver un abonnement
 *     description: |
 *       Réactive le compte avec mise à jour de la date d'expiration.
 *     tags:
 *       - Finances - Abonnements
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
 *         description: Abonnement réactivé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     statut:
 *                       type: string
 *                     reactiver_le:
 *                       type: string
 *                       format: date-time
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID abonnement invalide'
      })
    }

    const shop = await Shop.findById(id)
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement non trouvé'
      })
    }

    // Réactiver l'abonnement
    shop.active = true
    shop.reactivatedAt = new Date()
    shop.reactivatedBy = auth.admin._id
    
    // Si l'abonnement est expiré, prolonger d'un mois à partir d'aujourd'hui
    const now = new Date()
    if (shop.expire_date && shop.expire_date < now) {
      shop.expire_date = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    }
    
    await shop.save()

    // TODO: Logger dans audit log
    // TODO: Envoyer notification au propriétaire

    return res.status(200).json({
      success: true,
      message: 'Abonnement réactivé avec succès',
      data: {
        id: shop._id,
        statut: 'actif',
        reactiver_le: shop.reactivatedAt,
        date_expiration: shop.expire_date?.toISOString().split('T')[0]
      }
    })

  } catch (error) {
    console.error('❌ Réactivation API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}