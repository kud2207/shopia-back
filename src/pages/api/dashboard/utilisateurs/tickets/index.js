/**
 * @swagger
 * /api/dashboard/utilisateurs/tickets:
 *   get:
 *     summary: Liste des tickets avec filtres avancés
 *     description: |
 *       Retourne la liste paginée de tous les tickets de support.
 *       Permet de filtrer par statut, priorité, catégorie, administrateur assigné et recherche textuelle.
 *     tags:
 *       - Utilisateurs - Support & tickets
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par ID de ticket (ex: TKT-001) ou nom de l'abonné
 *
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [tous, ouverts, en_cours, resolus, fermes]
 *           default: tous
 *
 *       - in: query
 *         name: priorite
 *         schema:
 *           type: string
 *           enum: [critique, haute, moyenne, basse]
 *
 *       - in: query
 *         name: categorie
 *         schema:
 *           type: string
 *           description: Ex: bot_whatsapp, acces_compte, commande_erronee, paiement_bloque
 *
 *       - in: query
 *         name: assigne_a
 *         schema:
 *           type: string
 *         description: ID de l'administrateur assigné
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
 *         description: Liste des tickets récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
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
 *                             example: TKT-001
 *                           sujet:
 *                             type: string
 *                           abonne:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               nom:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               telephone:
 *                                 type: string
 *                           categorie:
 *                             type: string
 *                           priorite:
 *                             type: string
 *                           statut:
 *                             type: string
 *                           assigne_a:
 *                             type: object
 *                             nullable: true
 *                           date_creation:
 *                             type: string
 *                             format: date-time
 *                           temps_ecoule:
 *                             type: string
 *                           temps_resolution:
 *                             type: string
 *                             nullable: true
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         total_pages:
 *                           type: integer
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
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
    const auth = await withAuth({ roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] })(req, res)
    if (auth.error) return auth.error
    await dbConnect()

    const { search = '', statut = 'tous', priorite = '', categorie = '', assigne_a = '', page = 1, limit = 20 } = req.query
    const baseFilter = {}

    if (search) {
      if (search.toUpperCase().startsWith('TKT-')) baseFilter.ticketId = search.toUpperCase()
      else {
        const shops = await Shop.find({ name: { $regex: search, $options: 'i' } }).select('_id')
        baseFilter.shop = { $in: shops.map(s => s._id) }
      }
    }
    if (statut !== 'tous') {
      const map = { 'ouverts': 'open', 'en_cours': 'in_progress', 'resolus': 'resolved', 'fermes': 'closed' }
      baseFilter.status = map[statut] || statut
    }
    if (priorite) {
      const map = { 'critique': 'critical', 'haute': 'high', 'moyenne': 'medium', 'basse': 'low' }
      baseFilter.priority = map[priorite] || priorite
    }
    if (categorie) baseFilter.category = categorie
    if (assigne_a) baseFilter.assignedTo = assigne_a

    const tickets = await Ticket.find(baseFilter).populate('shop', 'name email phone').populate('assignedTo', 'name role').sort({ createdAt: -1 }).skip((parseInt(page) - 1) * parseInt(limit)).limit(parseInt(limit))
    const total = await Ticket.countDocuments(baseFilter)

    const formattedTickets = tickets.map(t => ({
      id: t.ticketId || `TKT-${t._id.toString().slice(-6).toUpperCase()}`,
      sujet: t.subject || t.title,
      abonne: { id: t.shop?._id, nom: t.shop?.name || 'Inconnu', email: t.shop?.email || '', telephone: t.shop?.phone || '' },
      categorie: t.category || 'Non catégorisé',
      priorite: t.priority || 'moyenne',
      statut: t.status || 'open',
      assigne_a: t.assignedTo ? { id: t.assignedTo._id, nom: t.assignedTo.name, role: t.assignedTo.role } : null,
      date_creation: t.createdAt?.toISOString(),
      temps_ecoule: getTimeAgo(t.createdAt),
      temps_resolution: t.resolutionTime ? formatDuration(t.resolutionTime) : null
    }))

    return res.status(200).json({
      success: true, message: 'Liste des tickets récupérée avec succès',
      data: { data: formattedTickets, pagination: { page: parseInt(page), limit: parseInt(limit), total, total_pages: Math.ceil(total / parseInt(limit)) } }
    })
  } catch (error) {
    console.error('❌ Tickets Liste API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}

function getTimeAgo(date) {
  if (!date) return 'Inconnu'
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'À l\'instant'
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} heure(s)`
  return `Il y a ${Math.floor(seconds / 86400)} jour(s)`
}
function formatDuration(ms) {
  const h = Math.floor(ms / (1000 * 60 * 60))
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}