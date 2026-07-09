/**
 * @swagger
 * /api/dashboard/finances/abonnements/{id}/renouveler:
 *   post:
 *     summary: Renouveler un abonnement
 *     description: |
 *       Prolonge la date d'expiration à partir de la date actuelle.
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
 *               - periode
 *             properties:
 *               periode:
 *                 type: string
 *                 enum: [mensuelle, trimestrielle, annuelle]
 *                 example: mensuelle
 *
 *     responses:
 *       200:
 *         description: Abonnement renouvelé
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
 *                     ancienne_expiration:
 *                       type: string
 *                       format: date
 *                     nouvelle_expiration:
 *                       type: string
 *                       format: date
 *                     periode:
 *                       type: string
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
      roles: ['super_admin', 'admin_financier'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query
    const { periode } = req.body

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID abonnement invalide'
      })
    }

    if (!periode || !['mensuelle', 'trimestrielle', 'annuelle'].includes(periode)) {
      return res.status(400).json({
        success: false,
        message: 'Période invalide (mensuelle, trimestrielle ou annuelle)'
      })
    }

    const shop = await Shop.findById(id).populate('plan')
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement non trouvé'
      })
    }

    // Sauvegarder l'ancienne date d'expiration
    const oldExpireDate = shop.expire_date ? new Date(shop.expire_date) : new Date()
    
    // Calculer la nouvelle date d'expiration
    const now = new Date()
    const newExpireDate = new Date(now)
    
    if (periode === 'mensuelle') {
      newExpireDate.setMonth(newExpireDate.getMonth() + 1)
    } else if (periode === 'trimestrielle') {
      newExpireDate.setMonth(newExpireDate.getMonth() + 3)
    } else if (periode === 'annuelle') {
      newExpireDate.setFullYear(newExpireDate.getFullYear() + 1)
    }

    // Mettre à jour l'abonnement
    shop.expire_date = newExpireDate
    shop.renewed = true
    shop.renewedAt = now
    shop.renewedBy = auth.admin._id
    
    await shop.save()

    // TODO: Créer un enregistrement de paiement pour le renouvellement
    // TODO: Envoyer notification au propriétaire

    return res.status(200).json({
      success: true,
      message: 'Abonnement renouvelé avec succès',
      data: {
        id: shop._id,
        ancienne_expiration: oldExpireDate.toISOString().split('T')[0],
        nouvelle_expiration: newExpireDate.toISOString().split('T')[0],
        periode: periode
      }
    })

  } catch (error) {
    console.error('❌ Renouvellement API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}