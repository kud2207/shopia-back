/**
 * @swagger
 * /api/dashboard/messages/conversations/{id}:
 *   get:
 *     summary: Détails d'une conversation
 *     description: Retourne les détails de la conversation avec l'historique complet des messages.
 *     tags:
 *       - Messagerie
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la conversation
 *
 *     responses:
 *       200:
 *         description: Détails de la conversation récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     abonne:
 *                       type: object
 *                     date_creation:
 *                       type: string
 *                       format: date-time
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Conversation from 'src/@apiCore/models/conversation'
import Message from 'src/@apiCore/models/message'
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

    const conversation = await Conversation.findById(id)
      .populate({
        path: 'shop',
        select: 'name owner type email phone',
        populate: {
          path: 'owner',
          select: 'name first_name last_name email phone image'
        }
      })

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation non trouvée' })
    }

    // Récupérer tous les messages de la conversation
    const messages = await Message.find({ conversation: id })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })

    // Marquer les messages de l'abonné comme lus par l'admin
    await Message.updateMany(
      { 
        conversation: id,
        senderType: 'shop',
        readBy: { $ne: auth.admin._id }
      },
      { $addToSet: { readBy: auth.admin._id } }
    )

    // Réinitialiser le compteur de non-lus
    conversation.unreadCount = 0
    await conversation.save()

    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      contenu: msg.content,
      date: msg.createdAt?.toISOString(),
      expediteur_type: msg.senderType,
      expediteur_id: msg.sender?._id,
      est_lu: msg.readBy?.some(id => id.toString() === auth.admin._id.toString()) || false,
      type: msg.type || 'texte'
    }))

    return res.status(200).json({
      success: true,
      conversation: {
        id: conversation._id,
        abonne: {
          id: conversation.shop?._id,
          nom_complet: conversation.shop?.owner?.name || conversation.shop?.name || 'Inconnu',
          email: conversation.shop?.email || conversation.shop?.owner?.email || '',
          telephone: conversation.shop?.phone || conversation.shop?.owner?.phone || '',
          avatar_url: conversation.shop?.owner?.image || '/images/avatars/shop.png',
          profil: getShopTypeLabel(conversation.shop?.type)
        },
        date_creation: conversation.createdAt?.toISOString(),
        messages: formattedMessages
      }
    })

  } catch (error) {
    console.error('❌ Conversation Details API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}

function getShopTypeLabel(type) {
  const labels = {
    'ecommerce': 'E-commerçante',
    'delivery': 'Livreur',
    'service': 'Prestataire'
  }
  return labels[type] || 'Abonné'
}