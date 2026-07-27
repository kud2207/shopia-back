/**
 * @swagger
 * /api/dashboard/messages/conversations/{id}/mark-as-read:
 *   patch:
 *     summary: Marquer la conversation comme lue
 *     description: Marque tous les messages non lus de la conversation comme lus.
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
 *
 *     responses:
 *       200:
 *         description: Conversation marquée comme lue
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Conversation from 'src/@apiCore/models/conversation'
import Message from 'src/@apiCore/models/message'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'PATCH') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    const conversation = await Conversation.findById(id)
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation non trouvée' })
    }

    // Marquer tous les messages comme lus par l'admin
    await Message.updateMany(
      { 
        conversation: id,
        senderType: 'shop',
        readBy: { $ne: auth.admin._id }
      },
      { $addToSet: { readBy: auth.admin._id } }
    )

    // Réinitialiser le compteur
    conversation.unreadCount = 0
    await conversation.save()

    return res.status(200).json({
      success: true,
      message: 'Conversation marquée comme lue'
    })

  } catch (error) {
    console.error('❌ Mark as Read API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}