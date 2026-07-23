/**
 * @swagger
 * /api/dashboard/utilisateurs/abonnes/{id}/reactiver:
 *   post:
 *     summary: Réactiver un compte abonné
 *     description: |
 *       Réactive l'accès au back office et met à jour la date d'expiration si nécessaire.
 *       
 *       **Règles métier** :
 *       - Réactiver l'accès
 *       - Mettre à jour la date d'expiration si le plan a changé
 *     tags:
 *       - Utilisateurs
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du compte abonné
 *
 *     responses:
 *       200:
 *         description: Compte réactivé avec succès
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
 *                     date_expiration:
 *                       type: string
 *                       format: date
 *
 *       403:
 *         description: Permissions insuffisantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'
import Shop from 'src/@apiCore/models/shop'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

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

    // Récupérer l'utilisateur
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Compte abonné non trouvé'
      })
    }

    // Vérifier si le compte est déjà actif
    if (user.active) {
      return res.status(400).json({
        success: false,
        message: 'Le compte est déjà actif'
      })
    }

    // Réactiver le compte
    user.active = true
    user.reactivatedAt = new Date()
    user.reactivatedBy = auth.admin._id
    
    await user.save()

    // Mettre à jour la date d'expiration si nécessaire
    const shop = await Shop.findOne({ owner: id })
    if (shop) {
      const now = new Date()
      if (shop.expire_date && shop.expire_date < now) {
        // Prolonger d'un mois si le plan est "starter"
        shop.expire_date = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
        await shop.save()
      }
    }

    // Enregistrer dans l'audit log
    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'REACTIVATE_ACCOUNT',
      targetId: user._id,
      details: 'Compte réactivé',
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    // TODO: Envoyer notification à l'abonné

    // Retourner la réponse
    return res.status(200).json({
      success: true,
      message: 'Compte réactivé avec succès',
      data: {
        id: user._id,
        statut: 'actif',
        reactiver_le: user.reactivatedAt,
        date_expiration: shop?.expire_date?.toISOString().split('T')[0]
      }
    })

  } catch (error) {
    console.error('❌ Réactivation compte abonné API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}