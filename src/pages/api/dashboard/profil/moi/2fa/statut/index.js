/**
 * @swagger
 * /api/dashboard/profil/moi/2fa/statut:
 *   get:
 *     summary: Statut de l'authentification à deux facteurs
 *     description: Retourne l'état actuel de la 2FA pour l'admin connecté.
 *     tags:
 *       - Profil Admin - Sécurité
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Statut récupéré avec succès
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
 *                     2fa_active:
 *                       type: boolean
 *                     method:
 *                       type: string
 *                       enum: [sms, email, authenticator]
 *                     backup_codes_count:
 *                       type: integer
 *                     configured_at:
 *                       type: string
 *                       format: date-time
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const admin = await Admin.findById(auth.admin._id)

    return res.status(200).json({
      success: true,
      message: 'Statut 2FA récupéré avec succès',
      data: {
        "2fa_active": admin.twoFactorEnabled || false,
        method: admin.twoFactorMethod || null,
        backup_codes_count: admin.twoFactorBackupCodes?.length || 0,
        configured_at: admin.twoFactorVerifiedAt?.toISOString() || null
      }
    })

  } catch (error) {
    console.error('❌ 2FA Status API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}