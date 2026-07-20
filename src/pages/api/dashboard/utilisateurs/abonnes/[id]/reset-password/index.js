/**
 * @swagger
 * /api/dashboard/utilisateurs/abonnes/{id}/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe
 *     description: |
 *       Génère un lien de réinitialisation temporaire (valide 24h).
 *       
 *       **Règles métier** :
 *       - Génère un lien de reset temporaire (valide 24h)
 *       - Envoie un email à l'abonné avec le lien
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
 *         description: Lien de réinitialisation envoyé avec succès
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
 *                     email:
 *                       type: string
 *                     lien_valide_jusqu:
 *                       type: string
 *                       format: date-time
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
import { generateResetToken, sendPasswordResetEmail } from 'src/@apiCore/lib/email'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_commercial'] 
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

    // Générer un token de réinitialisation
    const resetToken = generateResetToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    user.resetToken = resetToken
    user.resetTokenExpires = expiresAt
    await user.save()

    // Envoyer l'email
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      token: resetToken,
      expiresIn: '24 heures'
    })

    // Retourner la réponse
    return res.status(200).json({
      success: true,
      message: 'Lien de réinitialisation envoyé avec succès',
      data: {
        id: user._id,
        email: user.email,
        lien_valide_jusqu: expiresAt
      }
    })

  } catch (error) {
    console.error('❌ Réinitialisation mot de passe API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}