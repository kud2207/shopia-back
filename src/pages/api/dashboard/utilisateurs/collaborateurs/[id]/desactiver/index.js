/**
 * @swagger
 * /api/dashboard/utilisateurs/collaborateurs/{id}/desactiver:
 *   post:
 *     summary: Désactiver un collaborateur
 *     description: |
 *       Désactive l'accès du collaborateur à la boutique.
 *       
 *       **Règles métier** :
 *       - Désactiver l'accès immédiatement
 *       - Enregistrer le motif de désactivation
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
 *                 example: Départ de l'entreprise
 *
 *     responses:
 *       200:
 *         description: Collaborateur désactivé avec succès
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
 *                     desactive_le:
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
    const { motif } = req.body

    // Validation
    if (!motif || motif.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Motif requis (minimum 10 caractères)'
      })
    }

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

    // Désactiver le collaborateur
    collaborator.active = false
    collaborator.deactivationReason = motif
    collaborator.deactivatedAt = new Date()
    collaborator.deactivatedBy = auth.admin._id
    
    await collaborator.save()

    // Enregistrer dans l'audit log
    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'DEACTIVATE_COLLABORATOR',
      targetId: collaborator._id,
      details: `Collaborateur désactivé. Motif: ${motif}`,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    // Retourner la réponse
    return res.status(200).json({
      success: true,
      message: 'Collaborateur désactivé avec succès',
      data: {
        id: collaborator._id,
        statut: 'désactivé',
        desactive_le: collaborator.deactivatedAt
      }
    })

  } catch (error) {
    console.error(' Désactivation collaborateur API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}