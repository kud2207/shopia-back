/**
 * @swagger
 * /api/dashboard/messages/conversations:
 *   get:
 *     summary: Liste des conversations
 *     description: |
 *       Retourne la liste paginée des conversations avec les abonnés.
 *       
 *       **Filtres disponibles** :
 *       - `search` : Recherche par nom d'abonné
 *       - `statut` : toutes ou non_lues uniquement
 *     tags:
 *       - Messagerie
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom d'abonné
 *
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [toutes, non_lues]
 *           default: toutes
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *
 *     responses:
 *       200:
 *         description: Liste des conversations récupérée avec succès
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
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           abonne:
 *                             type: object
 *                           dernier_message:
 *                             type: object
 *                           messages_non_lus_count:
 *                             type: integer
 *                           date_dernier_message:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                     total_non_lues:
 *                       type: integer
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Conversation from 'src/@apiCore/models/conversation'
import Message from 'src/@apiCore/models/message'
import Shop from 'src/@apiCore/models/shop'
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

    const { search = '', statut = 'toutes', page = 1, limit = 20 } = req.query

    // Construire les filtres
    const filter = {}
    
    if (search) {
      const shops = await Shop.find({ 
        name: { $regex: search, $options: 'i' } 
      }).select('_id')
      
      filter.shop = { $in: shops.map(s => s._id) }
    }

    if (statut === 'non_lues') {
      filter.unreadCount = { $gt: 0 }
    }

    // Récupérer les conversations
    const conversations = await Conversation.find(filter)
      .populate({
        path: 'shop',
        select: 'name owner type',
        populate: {
          path: 'owner',
          select: 'name first_name last_name email phone image'
        }
      })
      .sort({ lastMessageAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    // Récupérer le dernier message de chaque conversation
    const conversationsWithData = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({ conversation: conv._id })
          .sort({ createdAt: -1 })
          .populate('sender', 'name')

        // Compter les messages non lus de cette conversation (pour l'admin)
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          senderType: 'shop',
          readBy: { $ne: auth.admin._id }
        })

        return {
          id: conv._id,
          abonne: {
            id: conv.shop?._id,
            nom_complet: conv.shop?.owner?.name || conv.shop?.name || 'Inconnu',
            avatar_url: conv.shop?.owner?.image || '/images/avatars/shop.png',
            profil: getShopTypeLabel(conv.shop?.type),
            boutique_nom: conv.shop?.name
          },
          dernier_message: lastMessage ? {
            contenu: lastMessage.content,
            date: lastMessage.createdAt?.toISOString(),
            temps_ecoule: getTimeAgo(lastMessage.createdAt),
            expediteur_type: lastMessage.senderType === 'admin' ? 'admin' : 'abonne',
            est_lu: lastMessage.readBy?.some(id => id.toString() === auth.admin._id.toString()) || false
          } : null,
          messages_non_lus_count: unreadCount,
          date_dernier_message: conv.lastMessageAt?.toISOString()
        }
      })
    )

    // Compter le total de conversations non lues
    const totalNonLues = await Conversation.countDocuments({
      unreadCount: { $gt: 0 }
    })

    const total = await Conversation.countDocuments(filter)

    return res.status(200).json({
      success: true,
      message: 'Conversations récupérées avec succès',
      data: {
        data: conversationsWithData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        },
        total_non_lues: totalNonLues
      }
    })

  } catch (error) {
    console.error('❌ Conversations API ERROR:', error)
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

function getTimeAgo(date) {
  if (!date) return ''
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'À l\'instant'
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} heure(s)`
  return `Il y a ${Math.floor(seconds / 86400)} jour(s)`
}