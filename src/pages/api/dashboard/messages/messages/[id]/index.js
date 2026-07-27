/**
 * @swagger
 * /api/dashboard/messages/messages/{id}:
 *   delete:
 *     summary: Supprimer un message
 *     description: |
 *       Supprime un message spécifique (soft delete).
 *       
 *       **Règles métier** :
 *       - Uniquement les messages envoyés par l'admin
 *       - Soft delete (archivage)
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
 *         description: Message supprimé avec succès
 *       403:
 *         description: Vous ne pouvez supprimer que vos propres messages
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Message from 'src/@apiCore/models/message'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'DELETE') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    const message = await Message.findById(id)
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message non trouvé' })
    }

    // Vérifier que c'est un message envoyé par l'admin
    if (message.senderType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres messages'
      })
    }

    if (message.sender.toString() !== auth.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres messages'
      })
    }

    // Soft delete
    message.isDeleted = true
    message.deletedAt = new Date()
    message.deletedBy = auth.admin._id
    message.content = '[Message supprimé]'
    await message.save()

    return res.status(200).json({
      success: true,
      message: 'Message supprimé avec succès'
    })

  } catch (error) {
    console.error('❌ Delete Message API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}