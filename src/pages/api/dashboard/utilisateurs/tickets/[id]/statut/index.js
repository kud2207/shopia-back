/**
 * @swagger
 * /api/dashboard/utilisateurs/tickets/{id}/statut:
 *   patch:
 *     summary: Changer le statut d'un ticket
 *     description: |
 *       Met à jour le statut du ticket et enregistre l'historique.
 *       
 *       **Règles métier** :
 *       - Logger le changement dans historique_statuts
 *       - Si statut = "resolu", enregistrer le temps de résolution
 *       - Notification email à l'abonné
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
 *               - statut
 *             properties:
 *               statut:
 *                 type: string
 *                 enum: [ouvert, en_cours, resolu, ferme]
 *                 example: resolu
 *
 *     responses:
 *       200:
 *         description: Statut mis à jour avec succès
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Ticket from 'src/@apiCore/models/ticket'
import { sendTicketStatusEmail } from 'src/@apiCore/lib/email'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query
    const { statut } = req.body

    // Mapping des statuts
    const statusMap = {
      'ouvert': 'open',
      'en_cours': 'in_progress',
      'resolu': 'resolved',
      'ferme': 'closed'
    }

    const newStatus = statusMap[statut]
    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      })
    }

    const ticket = await Ticket.findOne({
      $or: [{ ticketId: id }, { _id: id }]
    }).populate('shop', 'name email')

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      })
    }

    // Enregistrer l'ancien statut
    const oldStatus = ticket.status

    // Mettre à jour le statut
    ticket.status = newStatus

    // Ajouter à l'historique
    ticket.statusHistory.push({
      status: newStatus,
      date: new Date(),
      changedBy: auth.admin._id
    })

    // Si résolu, calculer le temps de résolution
    if (newStatus === 'resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date()
      ticket.resolutionTime = ticket.resolvedAt - ticket.createdAt
    }

    await ticket.save()

    // Logger dans l'audit log
    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'UPDATE_TICKET_STATUS',
      targetId: ticket._id,
      details: `Statut changé de "${oldStatus}" à "${newStatus}"`,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    // Envoyer notification email à l'abonné
    try {
      await sendTicketStatusEmail({
        email: ticket.shop?.email,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        newStatus: getStatusLabel(newStatus),
        adminName: `${auth.admin.prenom} ${auth.admin.nom}`
      })
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError)
    }

    return res.status(200).json({
      success: true,
      message: 'Statut du ticket mis à jour avec succès',
      data: {
        id: ticket.ticketId,
        statut: getStatusLabel(newStatus),
        updated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Update Ticket Status API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

function getStatusLabel(status) {
  const labels = {
    'open': 'Ouvert',
    'in_progress': 'En cours',
    'resolved': 'Résolu',
    'closed': 'Fermé'
  }
  return labels[status] || status
}