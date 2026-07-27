/**
 * @swagger
 * /api/dashboard/profil/moi/2fa/verifier:
 *   post:
 *     summary: Vérifier le code 2FA
 *     description: |
 *       Vérifie le code de vérification et active la 2FA si valide.
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
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "123456"
 *
 *     responses:
 *       200:
 *         description: 2FA activée avec succès
 *       400:
 *         description: Code invalide ou expiré
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import speakeasy from 'speakeasy'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Le code de vérification est requis'
      })
    }

    const admin = await Admin.findById(auth.admin._id)

    if (!admin.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Aucune configuration 2FA en cours. Veuillez d\'abord activer la 2FA.'
      })
    }

    // Vérifier le code TOTP
    const verified = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2 // Accepte les codes de 2 périodes avant/après
    })

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Code invalide ou expiré. Veuillez réessayer.'
      })
    }

    // Activer la 2FA
    admin.twoFactorEnabled = true
    admin.twoFactorVerifiedAt = new Date()
    await admin.save()

    // Logger dans l'audit log
    await new AuditLog({
      userId: admin._id,
      action: 'ENABLE_2FA',
      targetId: admin._id,
      targetModel: 'Admin',
      details: { 
        method: admin.twoFactorMethod,
        action: 'Activation de l\'authentification à deux facteurs'
      },
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }).save()

    return res.status(200).json({
      success: true,
      message: 'Authentification à deux facteurs activée avec succès',
      data: {
        twoFactorEnabled: true,
        method: admin.twoFactorMethod,
        backup_codes_count: admin.twoFactorBackupCodes?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ 2FA Verify API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}