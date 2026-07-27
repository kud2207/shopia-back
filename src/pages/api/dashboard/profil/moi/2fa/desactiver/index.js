/**
 * @swagger
 * /api/dashboard/profil/moi/2fa/desactiver:
 *   post:
 *     summary: Désactiver l'authentification à deux facteurs
 *     description: |
 *       Désactive la 2FA après vérification du mot de passe.
 *     tags:
 *       - Profil Admin - Sécurité
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 example: monMotDePasseActuel
 *
 *     responses:
 *       200:
 *         description: 2FA désactivée avec succès
 *       401:
 *         description: Mot de passe incorrect
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import bcrypt from 'bcrypt'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { password } = req.body

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe est requis'
      })
    }

    const admin = await Admin.findById(auth.admin._id).select('+password')

    if (!admin.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'La 2FA n\'est pas activée sur votre compte'
      })
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, admin.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe incorrect'
      })
    }

    // Désactiver la 2FA
    admin.twoFactorEnabled = false
    admin.twoFactorSecret = undefined
    admin.twoFactorMethod = undefined
    admin.twoFactorBackupCodes = undefined
    admin.twoFactorVerifiedAt = undefined
    await admin.save()

    // Logger dans l'audit log
    await new AuditLog({
      userId: admin._id,
      action: 'DISABLE_2FA',
      targetId: admin._id,
      targetModel: 'Admin',
      details: { action: 'Désactivation de l\'authentification à deux facteurs' },
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }).save()

    return res.status(200).json({
      success: true,
      message: 'Authentification à deux facteurs désactivée avec succès',
      data: {
        twoFactorEnabled: false
      }
    })

  } catch (error) {
    console.error('❌ 2FA Disable API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}