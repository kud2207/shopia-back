/**
 * @swagger
 * /api/dashboard/profil/moi/2fa/backup-codes:
 *   post:
 *     summary: Générer de nouveaux codes de secours
 *     description: |
 *       Génère de nouveaux codes de secours pour la 2FA.
 *       Les anciens codes sont invalidés.
 *     tags:
 *       - Profil Admin - Sécurité
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Codes de secours générés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     backup_codes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["ABC123", "DEF456", "GHI789"]
 *                     expires_at:
 *                       type: string
 *                       format: date
 *                       description: Les codes n'expirent pas mais doivent être stockés en sécurité
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const admin = await Admin.findById(auth.admin._id)

    if (!admin.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'La 2FA doit être activée pour générer des codes de secours'
      })
    }

    // Générer de nouveaux codes de secours
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    )

    admin.twoFactorBackupCodes = backupCodes
    admin.twoFactorBackupCodesGeneratedAt = new Date()
    await admin.save()

    // Logger dans l'audit log
    await new AuditLog({
      userId: admin._id,
      action: 'GENERATE_2FA_BACKUP_CODES',
      targetId: admin._id,
      targetModel: 'Admin',
      details: { 
        action: 'Génération de nouveaux codes de secours 2FA',
        codes_count: backupCodes.length
      },
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }).save()

    return res.status(200).json({
      success: true,
      message: 'Codes de secours générés avec succès. Stockez-les en lieu sûr!',
      data: {
        backup_codes: backupCodes,
        expires_at: null, // Les codes n'expirent pas
        generated_at: admin.twoFactorBackupCodesGeneratedAt
      }
    })

  } catch (error) {
    console.error('❌ 2FA Backup Codes API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}