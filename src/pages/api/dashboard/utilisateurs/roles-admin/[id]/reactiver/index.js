/**
 * @swagger
 * /api/dashboard/utilisateurs/roles-admin/{id}/reactiver:
 *   post:
 *     summary: Réactiver un administrateur
 *     description: Réactive l'accès de l'administrateur
 *     tags:
 *       - Utilisateurs - Rôles admin
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *
 *     responses:
 *       200:
 *         description: Administrateur réactivé avec succès
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
      roles: ['super_admin'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    const admin = await Admin.findById(id)
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur non trouvé'
      })
    }

    if (admin.active) {
      return res.status(400).json({
        success: false,
        message: 'L\'administrateur est déjà actif'
      })
    }

    admin.active = true
    admin.reactivatedAt = new Date()
    admin.reactivatedBy = auth.admin._id
    admin.deactivationReason = undefined
    admin.deactivatedAt = undefined
    admin.deactivatedBy = undefined
    
    await admin.save()

    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'REACTIVATE_ADMIN',
      targetId: admin._id,
      details: 'Administrateur réactivé',
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    return res.status(200).json({
      success: true,
      message: 'Administrateur réactivé avec succès',
      data: {
        id: admin._id,
        statut: 'actif',
        reactiver_le: admin.reactivatedAt
      }
    })

  } catch (error) {
    console.error('❌ Réactivation admin API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}