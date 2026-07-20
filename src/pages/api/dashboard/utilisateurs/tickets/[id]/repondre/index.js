/**
 * @swagger
 * /api/dashboard/utilisateurs/tickets/{id}/repondre:
 *   post:
 *     summary: Répondre à un ticket
 *     description: |
 *       Envoie une réponse à l'abonné dans le ticket.
 *       
 *       **Règles métier** :
 *       - Créer un nouveau message dans la conversation
 *       - Si l'admin répond, changer automatiquement le statut en "en_cours" si c'était "ouvert"
 *       - Envoyer email à l'abonné avec la réponse
 *       - Marquer le message comme "lu" = false pour l'abonné
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
 *               - contenu
 *             properties:
 *               contenu:
 *                 type: string
 *                 example: "Bonjour, nous avons identifié le problème..."
 *
 *     responses:
 *       200:
 *         description: Réponse envoyée avec succès
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Ticket from 'src/@apiCore/models/ticket'
import { sendTicketReplyEmail } from 'src/@apiCore/lib/email'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query
    const { contenu } = req.body

    if (!contenu || contenu.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu de la réponse doit contenir au moins 5 caractères'
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

    // Ajouter le message
    ticket.messages.push({
      sender: auth.admin._id,
      senderType: 'admin',
      content: contenu.trim(),
      read: false,
      createdAt: new Date()
    })

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

    // Envoyer email à l'abonné
    try {
      await sendTicketReplyEmail({
        email: ticket.shop?.email,
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        replyContent: contenu,
        adminName: `${auth.admin.prenom} ${auth.admin.nom}`
      })
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError)
    }

    return res.status(200).json({
      success: true,
      message: 'Réponse envoyée avec succès',
      data: {
        id: ticket.ticketId,
        message_count: ticket.messages.length,
        statut: getStatusLabel(ticket.status)
      }
    })

  } catch (error) {
    console.error(' Reply Ticket API ERROR:', error)
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