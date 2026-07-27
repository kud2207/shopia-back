/**
 * @swagger
 * /api/dashboard/messages/compteur:
 *   get:
 *     summary: Compteur de messages non lus
 *     description: Retourne le nombre total de conversations et messages non lus.
 *     tags:
 *       - Messagerie
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Compteur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_conversations_non_lues:
 *                   type: integer
 *                   example: 5
 *                 total_messages_non_lus:
 *                   type: integer
 *                   example: 12
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

    // Compter les conversations avec des messages non lus
    const totalConversationsNonLues = await Conversation.countDocuments({
      unreadCount: { $gt: 0 }
    })

    // Compter le total de messages non lus (envoyés par les shops, non lus par les admins)
    const totalMessagesNonLus = await Message.countDocuments({
      senderType: 'shop',
      readBy: { $ne: auth.admin._id }
    })

    return res.status(200).json({
      success: true,
      data: {
        total_conversations_non_lues: totalConversationsNonLues,
        total_messages_non_lus: totalMessagesNonLus
      }
    })

  } catch (error) {
    console.error('❌ Message Counter API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}