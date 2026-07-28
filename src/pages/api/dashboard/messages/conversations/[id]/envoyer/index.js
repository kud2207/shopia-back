/**
 * @swagger
 * /api/dashboard/messages/conversations/{id}/envoyer:
 *   post:
 *     summary: Envoyer un message
 *     description: |
 *       Envoie un message dans une conversation.
 *       
 *       **Règles métier** :
 *       - Crée le message avec type "admin" comme expéditeur
 *       - Envoie notification push/email à l'abonné
 *       - Met à jour date_dernier_message
 *       - Marque les messages de l'abonné comme lus
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
 *                 example: "Bonjour Mme Sarah, je vérifie ça immédiatement pour vous."
 *               type:
 *                 type: string
 *                 enum: [texte, fichier]
 *                 default: texte
 *
 *     responses:
 *       200:
 *         description: Message envoyé avec succès
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Conversation from 'src/@apiCore/models/conversation'
import Message from 'src/@apiCore/models/message'
import { sendNewMessageEmail } from 'src/@apiCore/lib/email'
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
    const { contenu, type = 'texte' } = req.body

    if (!contenu || contenu.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du message ne peut pas être vide'
      })
    }

    const conversation = await Conversation.findById(id)
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation non trouvée' })
    }

    // Créer le message
    const message = new Message({
      conversation: conversation._id,
      sender: auth.admin._id,
      senderType: 'admin',
      content: contenu.trim(),
      type: type,
      readBy: [auth.admin._id]
    })
    await message.save()

    // Mettre à jour la conversation
    conversation.lastMessageAt = new Date()
    await conversation.save()

    // Marquer les messages de l'abonné comme lus
    await Message.updateMany(
      { 
        conversation: id,
        senderType: 'shop',
        readBy: { $ne: auth.admin._id }
      },
      { $addToSet: { readBy: auth.admin._id } }
    )

    // Envoyer notification email à l'abonné (si activé)
    try {
      const shop = await conversation.shop.populate('owner')
      if (shop?.owner?.email) {
        await sendNewMessageEmail({
          email: shop.owner.email,
          name: shop.owner.name,
          messageContent: contenu,
          adminName: `${auth.admin.prenom} ${auth.admin.nom}`
        })
      }
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError)
    }

    // TODO: Envoyer notification push (via Firebase ou autre)

    return res.status(200).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: {
        id: message._id,
        contenu: message.content,
        date: message.createdAt?.toISOString(),
        expediteur_type: 'admin'
      }
    })

  } catch (error) {
    console.error('❌ Send Message API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}