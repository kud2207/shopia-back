/**
 * @swagger
 * /api/dashboard/profil/moi/2fa/activer:
 *   post:
 *     summary: Activer l'authentification à deux facteurs (2FA)
 *     description: |
 *       Active la 2FA pour le compte de l'admin.
 *       
 *       **Méthodes disponibles** :
 *       - SMS : Code envoyé par SMS
 *       - Email : Code envoyé par email
 *       - authenticator : Application d'authentification (Google Authenticator, Authy)
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
 *               - method
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [sms, email, authenticator]
 *                 example: authenticator
 *
 *     responses:
 *       200:
 *         description: 2FA activée avec succès
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
 *                     secret:
 *                       type: string
 *                     qr_code_url:
 *                       type: string
 *                       description: URL du QR code pour scanner avec l'app
 *                     backup_codes:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Méthode invalide
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import AuditLog from 'src/@apiCore/models/auditLog'
import { send2FACodeEmail } from 'src/@apiCore/lib/email'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { method } = req.body

    if (!['sms', 'email', 'authenticator'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Méthode invalide. Utilisez: sms, email ou authenticator'
      })
    }

    const admin = await Admin.findById(auth.admin._id)

    // Générer un secret TOTP
    const secret = speakeasy.generateSecret({
      name: `ShopIA - ${admin.email}`,
      issuer: 'ShopIA'
    })

    // Générer des codes de secours
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    )

    // Sauvegarder temporairement le secret (en attente de vérification)
    admin.twoFactorSecret = secret.base32
    admin.twoFactorMethod = method
    admin.twoFactorBackupCodes = backupCodes
    admin.twoFactorEnabled = false // Sera activé après vérification
    await admin.save()

    let responseData = {
      secret: secret.base32,
      backup_codes: backupCodes,
      method: method
    }

    // Générer le QR code pour authenticator
    if (method === 'authenticator') {
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)
      responseData.qr_code_url = qrCodeUrl
      responseData.otpauth_url = secret.otpauth_url
    } 
    // Envoyer le code par email
    else if (method === 'email') {
      const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
        step: 300 // Code valide 5 minutes
      })
      
      await send2FACodeEmail({
        email: admin.email,
        name: `${admin.prenom} ${admin.nom}`,
        code: token,
        expiresIn: '5 minutes'
      })
      
      responseData.message = 'Un code de vérification a été envoyé à votre email'
    }
    // Pour SMS (à implémenter avec un service comme Twilio)
    else if (method === 'sms') {
      // TODO: Implémenter l'envoi SMS
      responseData.message = 'L\'envoi SMS sera implémenté prochainement'
    }

    return res.status(200).json({
      success: true,
      message: '2FA initialisée. Veuillez vérifier le code pour activer.',
      data: responseData
    })

  } catch (error) {
    console.error('❌ 2FA Enable API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}