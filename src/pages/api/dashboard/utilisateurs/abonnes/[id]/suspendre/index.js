/**
 * @swagger
 * /api/dashboard/utilisateurs/abonnes/{id}/suspendre:
 *   post:
 *     summary: Suspendre un compte abonné
 *     description: |
 *       Suspend immédiatement l'accès au back office.
 *       
 *       **Règles métier** :
 *       - Désactiver l'accès au back office immédiatement
 *       - Enregistrer le motif de suspension
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
 *         description: Compte suspendu avec succès
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
 *                     suspendu_le:
 *                       type: string
 *                       format: date-time
 *
 *       400:
 *         description: Motif requis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
    const { motif } = req.body

    // Validation
    if (!motif || motif.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Motif requis (minimum 10 caractères)'
      })
    }

    // Récupérer l'utilisateur
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Compte abonné non trouvé'
      })
    }

    // Suspendre le compte
    user.active = false
    user.suspensionReason = motif
    user.suspendedAt = new Date()
    user.suspendedBy = auth.admin._id
    
    await user.save()

    // Enregistrer dans l'audit log
    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'SUSPEND_ACCOUNT',
      targetId: user._id,
      details: `Compte suspendu. Motif: ${motif}`,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    // TODO: Envoyer notification à l'abonné

    // Retourner la réponse
    return res.status(200).json({
      success: true,
      message: 'Compte suspendu avec succès',
      data: {
        id: user._id,
        statut: 'suspendu',
        suspendu_le: user.suspendedAt
      }
    })

  } catch (error) {
    console.error('❌ Suspension compte abonné API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}