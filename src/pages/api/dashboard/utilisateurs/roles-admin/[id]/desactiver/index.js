/**
 * @swagger
 * /api/dashboard/utilisateurs/roles-admin/{id}/desactiver:
 *   post:
 *     summary: Désactiver un administrateur
 *     description: |
 *       Désactive l'accès sans supprimer le compte.
 *       
 *       **Règles métier** :
 *       - Enregistrer le motif de désactivation
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
 *         description: Administrateur désactivé avec succès
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
    const { motif } = req.body

    if (!motif || motif.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Motif requis (minimum 10 caractères)'
      })
    }

    const admin = await Admin.findById(id)
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur non trouvé'
      })
    }

    // Impossible de désactiver son propre compte
    if (admin._id.toString() === auth.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas désactiver votre propre compte'
      })
    }

    admin.active = false
    admin.deactivationReason = motif
    admin.deactivatedAt = new Date()
    admin.deactivatedBy = auth.admin._id
    
    await admin.save()

    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'DEACTIVATE_ADMIN',
      targetId: admin._id,
      details: `Administrateur désactivé. Motif: ${motif}`,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    return res.status(200).json({
      success: true,
      message: 'Administrateur désactivé avec succès',
      data: {
        id: admin._id,
        statut: 'désactivé',
        desactive_le: admin.deactivatedAt
      }
    })

  } catch (error) {
    console.error('❌ Désactivation admin API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}