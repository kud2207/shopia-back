/**
 * @swagger
 * /api/dashboard/utilisateurs/tickets/{id}/annuler:
 *   post:
 *     summary: Annuler/fermer un ticket
 *     description: |
 *       Ferme un ticket avec un motif.
 *       
 *       **Règles métier** :
 *       - Changer le statut en "ferme"
 *       - Logger le motif
 *       - Notification à l'abonné
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
 *               - motif
 *             properties:
 *               motif:
 *                 type: string
 *                 example: "Ticket résolu par l'abonné"
 *
 *     responses:
 *       200:
 *         description: Ticket annulé avec succès
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Ticket from 'src/@apiCore/models/ticket'
import { sendTicketClosedEmail } from 'src/@apiCore/lib/email'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

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
    const { motif } = req.body

    if (!motif || motif.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Le motif doit contenir au moins 10 caractères'
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

    // Vérifier que le ticket n'est pas déjà fermé
    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Ce ticket est déjà fermé'
      })
    }

    // Mettre à jour le statut
    const oldStatus = ticket.status
    ticket.status = 'closed'
    ticket.closedAt = new Date()
    ticket.closedBy = auth.admin._id
    ticket.closureReason = motif.trim()

    // Ajouter à l'historique
    ticket.statusHistory.push({
      status: 'closed',
      date: new Date(),
      changedBy: auth.admin._id,
      reason: motif.trim()
    })

    await ticket.save()

    // Logger dans l'audit log
    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'CLOSE_TICKET',
      targetId: ticket._id,
      details: `Ticket fermé. Motif: ${motif}`,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    // Envoyer notification à l'abonné
    try {
      await sendTicketClosedEmail({
        email: ticket.shop?.email,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        closureReason: motif,
        adminName: `${auth.admin.prenom} ${auth.admin.nom}`
      })
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError)
    }

    return res.status(200).json({
      success: true,
      message: 'Ticket fermé avec succès',
      data: {
        id: ticket.ticketId,
        statut: 'Fermé',
        ferme_le: ticket.closedAt?.toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Close Ticket API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}