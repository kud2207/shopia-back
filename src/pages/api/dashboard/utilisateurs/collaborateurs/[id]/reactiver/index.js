/**
 * @swagger
 * /api/dashboard/utilisateurs/collaborateurs/{id}/reactiver:
 *   post:
 *     summary: Réactiver un collaborateur
 *     description: |
 *       Réactive l'accès du collaborateur à la boutique.
 *     tags:
 *       - Utilisateurs - Collaborateurs
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du collaborateur
 *
 *     responses:
 *       200:
 *         description: Collaborateur réactivé avec succès
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
 *
 *       400:
 *         description: Le compte est déjà actif
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
      roles: ['super_admin', 'admin_support', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    // Récupérer le collaborateur
    const collaborator = await User.findById(id)
    if (!collaborator) {
      return res.status(404).json({
        success: false,
        message: 'Collaborateur non trouvé'
      })
    }

    // Vérifier que c'est bien un collaborateur
    if (!['vendeur', 'gestionnaire', 'admin_boutique'].includes(collaborator.role)) {
      return res.status(400).json({
        success: false,
        message: 'Cet utilisateur n\'est pas un collaborateur'
      })
    }

    // Vérifier si le compte est déjà actif
    if (collaborator.active) {
      return res.status(400).json({
        success: false,
        message: 'Le compte est déjà actif'
      })
    }

    // Réactiver le collaborateur
    collaborator.active = true
    collaborator.reactivatedAt = new Date()
    collaborator.reactivatedBy = auth.admin._id
    collaborator.deactivationReason = undefined
    collaborator.deactivatedAt = undefined
    collaborator.deactivatedBy = undefined
    
    await collaborator.save()

    // Enregistrer dans l'audit log
    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'REACTIVATE_COLLABORATOR',
      targetId: collaborator._id,
      details: 'Collaborateur réactivé',
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    // Retourner la réponse
    return res.status(200).json({
      success: true,
      message: 'Collaborateur réactivé avec succès',
      data: {
        id: collaborator._id,
        statut: 'actif',
        reactiver_le: collaborator.reactivatedAt
      }
    })

  } catch (error) {
    console.error('❌ Réactivation collaborateur API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}