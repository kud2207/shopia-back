/**
 * @swagger
 * /api/dashboard/utilisateurs/roles-admin/{id}:
 *   delete:
 *     summary: Supprimer un administrateur
 *     description: |
 *       Supprime définitivement un administrateur (soft delete).
 *       
 *       **Règles métier** :
 *       - Uniquement pour Super Admin
 *       - Soft delete (archivage)
 *       - Impossible de supprimer son propre compte
 *       - Transférer les tickets assignés avant suppression
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
 *         description: Administrateur supprimé avec succès
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import Ticket from 'src/@apiCore/models/ticket'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'DELETE') return res.status(405).json({ message: 'Méthode non autorisée' })

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

    // Impossible de supprimer son propre compte
    if (admin._id.toString() === auth.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      })
    }

    // Vérifier s'il reste au moins un super admin
    if (admin.role === 'super_admin') {
      const superAdminCount = await Admin.countDocuments({ role: 'super_admin', active: true })
      if (superAdminCount <= 1) {
        return res.status(403).json({
          success: false,
          message: 'Impossible de supprimer le dernier Super Admin'
        })
      }
    }

    // Transférer les tickets assignés
    await Ticket.updateMany(
      { assignedTo: admin._id },
      { $set: { assignedTo: null, status: 'open' } }
    )

    // Soft delete
    admin.isDelete = true
    admin.deletedAt = new Date()
    admin.deletedBy = auth.admin._id
    admin.name = 'Supprimé ' + admin.name
    admin.email = 'supprime_' + admin._id + '@shopia.com'
    admin.password = ''
    admin.role = 'deleted'
    admin.active = false
    admin.permissions = []
    
    await admin.save()

    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'DELETE_ADMIN',
      targetId: admin._id,
      details: 'Administrateur supprimé (soft delete)',
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    return res.status(200).json({
      success: true,
      message: 'Administrateur supprimé avec succès',
      data: {
        id: admin._id,
        nom_complet: admin.name,
        date_suppression: admin.deletedAt
      }
    })

  } catch (error) {
    console.error('❌ Suppression admin API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}