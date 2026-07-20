/**
 * @swagger
 * /api/dashboard/utilisateurs/tickets/{id}/assigner:
 *   post:
 *     summary: Assigner un ticket à un admin
 *     description: |
 *       Assigne un ticket à un administrateur.
 *       
 *       **Règles métier** :
 *       - Vérifier que l'admin existe et a le rôle approprié
 *       - Notification à l'admin assigné
 *       - Logger dans audit_log
 *     tags:
 *       - Utilisateurs - Support & tickets
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
 *               - admin_id
 *             properties:
 *               admin_id:
 *                 type: string
 *                 example: 64fd1234567890abcdef12345
 *
 *     responses:
 *       200:
 *         description: Ticket assigné avec succès
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Ticket from 'src/@apiCore/models/ticket'
import Admin from 'src/@apiCore/models/admin'
import { sendTicketAssignmentEmail } from 'src/@apiCore/lib/email'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query
    const { admin_id } = req.body

    if (!admin_id || !Types.ObjectId.isValid(admin_id)) {
      return res.status(400).json({
        success: false,
        message: 'ID admin invalide'
      })
    }

    // Vérifier que l'admin existe
    const admin = await Admin.findById(admin_id)
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrateur non trouvé'
      })
    }

    // Vérifier que l'admin a un rôle approprié
    if (!['super_admin', 'admin_support'].includes(admin.role)) {
      return res.status(400).json({
        success: false,
        message: 'Cet administrateur ne peut pas recevoir de tickets'
      })
    }

    // Trouver le ticket
    const ticket = await Ticket.findOne({
      $or: [{ ticketId: id }, { _id: id }]
    }).populate('shop', 'name email')

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      })
    }

    // Assigner le ticket
    const previousAssignee = ticket.assignedTo
    ticket.assignedTo = admin_id
    
    // Si le ticket était ouvert, le passer en cours
    if (ticket.status === 'open') {
      ticket.status = 'in_progress'
      ticket.statusHistory.push({
        status: 'in_progress',
        date: new Date(),
        changedBy: auth.admin._id
      })
    }

    await ticket.save()

    // Logger dans l'audit log
    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'ASSIGN_TICKET',
      targetId: ticket._id,
      details: `Ticket assigné de "${previousAssignee?.name || 'Personne'}" à "${admin.name}"`,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    // Envoyer notification à l'admin assigné
    try {
      await sendTicketAssignmentEmail({
        email: admin.email,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        priority: ticket.priority,
        assignedBy: `${auth.admin.prenom} ${auth.admin.nom}`
      })
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError)
    }

    return res.status(200).json({
      success: true,
      message: 'Ticket assigné avec succès',
      data: {
        id: ticket.ticketId,
        assigne_a: {
          id: admin._id,
          nom: admin.name,
          role: admin.role
        }
      }
    })

  } catch (error) {
    console.error('❌ Assign Ticket API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}