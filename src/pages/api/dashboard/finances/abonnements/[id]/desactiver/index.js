/**
 * @swagger
 * /api/dashboard/finances/abonnements/{id}/desactiver:
 *   post:
 *     summary: Désactiver un abonnement
 *     description: |
 *       Désactive l'accès au back office pour l'abonné.
 *       Nécessite un motif de désactivation.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - motif
 *             properties:
 *               motif:
 *                 type: string
 *                 example: Non-paiement des factures
 *
 *     responses:
 *       200:
 *         description: Abonnement désactivé
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
 *                     desactive_le:
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
    const { motif } = req.body

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID abonnement invalide'
      })
    }

    if (!motif || motif.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Motif requis (minimum 10 caractères)'
      })
    }

    const shop = await Shop.findById(id)
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement non trouvé'
      })
    }

    // Désactiver l'abonnement
    shop.active = false
    shop.deactivationReason = motif
    shop.deactivatedAt = new Date()
    shop.deactivatedBy = auth.admin._id
    
    await shop.save()

    // TODO: Logger dans audit log
    // TODO: Envoyer notification au propriétaire

    return res.status(200).json({
      success: true,
      message: 'Abonnement désactivé avec succès',
      data: {
        id: shop._id,
        statut: 'desactiver',
        desactive_le: shop.deactivatedAt
      }
    })

  } catch (error) {
    console.error('❌ Désactivation API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}