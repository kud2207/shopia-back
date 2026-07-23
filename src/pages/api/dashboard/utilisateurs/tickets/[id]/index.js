/**
 * @swagger
 * /api/dashboard/utilisateurs/tickets/{id}:
 *   get:
 *     summary: Détails complets d'un ticket
 *     description: |
 *       Retourne les détails complets du ticket avec messages et historique.
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
 *         description: ID du ticket (TKT-001)
 *
 *     responses:
 *       200:
 *         description: Détails du ticket récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     sujet:
 *                       type: string
 *                     description:
 *                       type: string
 *                     abonne:
 *                       type: object
 *                     categorie:
 *                       type: string
 *                     priorite:
 *                       type: string
 *                     statut:
 *                       type: string
 *                     assigne_a:
 *                       type: object
 *                     date_creation:
 *                       type: string
 *                       format: date-time
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                     historique_statuts:
 *                       type: array
 *                       items:
 *                         type: object
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Ticket from 'src/@apiCore/models/ticket'
import Shop from 'src/@apiCore/models/shop'
import Admin from 'src/@apiCore/models/admin'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    // Trouver le ticket par ticketId ou _id
    const ticket = await Ticket.findOne({
      $or: [
        { ticketId: id },
        { _id: id }
      ]
    })
      .populate('shop', 'name email whatsapp')
      .populate('assignedTo', 'name role')
      .populate('messages.sender', 'name')

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      })
    }

    // Formater les messages
    const formattedMessages = ticket.messages.map(msg => ({
      id: msg._id,
      expediteur: msg.senderType === 'customer' ? 'abonne' : 'admin',
      contenu: msg.content,
      date: msg.createdAt?.toISOString(),
      lu: msg.read
    }))

    // Formater l'historique des statuts
    const formattedHistory = ticket.statusHistory.map(h => ({
      statut: getStatusLabel(h.status),
      date: h.date?.toISOString(),
      par: h.changedBy?.name || 'Système'
    }))

    return res.status(200).json({
      success: true,
      data: {
        id: ticket.ticketId,
        sujet: ticket.subject || ticket.title,
        description: ticket.description,
        abonne: {
          nom: ticket.shop?.name || 'Inconnu',
          email: ticket.shop?.email || '',
          telephone: ticket.shop?.whatsapp || ''
        },
        categorie: getCategoryLabel(ticket.category),
        priorite: getPriorityLabel(ticket.priority),
        statut: getStatusLabel(ticket.status),
        assigne_a: ticket.assignedTo ? {
          id: ticket.assignedTo._id,
          nom: ticket.assignedTo.name,
          role: getRoleLabel(ticket.assignedTo.role)
        } : null,
        date_creation: ticket.createdAt?.toISOString(),
        messages: formattedMessages,
        historique_statuts: formattedHistory
      }
    })

  } catch (error) {
    console.error('❌ Ticket Details API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// Helpers
function getCategoryLabel(category) {
  const labels = {
    'bot_whatsapp': 'Bot WhatsApp',
    'account_access': 'Accès compte',
    'wrong_order': 'Commande erronée',
    'payment_blocked': 'Paiement bloqué'
  }
  return labels[category] || category
}

function getPriorityLabel(priority) {
  const labels = {
    'critical': 'Critique',
    'high': 'Haute',
    'medium': 'Moyenne',
    'low': 'Basse'
  }
  return labels[priority] || priority
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

function getRoleLabel(role) {
  const labels = {
    'admin_support': 'Admin Support',
    'super_admin': 'Super Admin',
    'admin_financier': 'Admin Financier',
    'admin_commercial': 'Admin Commercial'
  }
  return labels[role] || role
}