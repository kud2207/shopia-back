/**
 * @swagger
 * /api/boutiques/shopbot/incidents:
 *   get:
 *     summary: Incidents bots signalés
 *     description: Liste les incidents et erreurs rencontrés par les bots ShopBot
 *     tags:
 *       - ShopBot
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: boutique_id
 *         schema:
 *           type: string
 *
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, erreur_connexion, coupure_service, reponses_erronees]
 *           default: all
 *
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *           default: week
 *
 *     responses:
 *       200:
 *         description: Incidents récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       boutique:
 *                         type: string
 *                       description:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       statut:
 *                         type: string
 *                         enum: [Nouveau, En cours, Résolu]
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Incident from 'src/@apiCore/models/incident'
import Shop from 'src/@apiCore/models/shop'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { boutique_id, type = 'all', period = 'week' } = req.query

    // 📅 Calculer la période
    const now = new Date()
    let startDate = new Date(now)
    
    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7)
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1)
    }

    // 🔧 Construire les filtres
    const baseFilter = {
      createdAt: { $gte: startDate },
      source: 'shopbot'
    }

    if (boutique_id && Types.ObjectId.isValid(boutique_id)) {
      baseFilter.shop = new Types.ObjectId(boutique_id)
    }

    if (type !== 'all') {
      if (type === 'erreur_connexion') baseFilter.type = 'whatsapp_connection_error'
      else if (type === 'coupure_service') baseFilter.type = 'service_interruption'
      else if (type === 'reponses_erronees') baseFilter.type = 'wrong_responses'
    }

    // Récupérer les incidents
    const incidents = await Incident.find(baseFilter)
      .populate('shop', 'name')
      .sort({ createdAt: -1 })
      .limit(50)

    // Formater les incidents
    const formattedIncidents = incidents.map(incident => {
      let typeLabel = 'Erreur inconnue'
      if (incident.type === 'whatsapp_connection_error') typeLabel = 'Erreur connexion WhatsApp'
      else if (incident.type === 'service_interruption') typeLabel = 'Coupure service'
      else if (incident.type === 'wrong_responses') typeLabel = 'Réponses erronées'
      else if (incident.type === 'api_timeout') typeLabel = 'Timeout API'

      let statut = 'Nouveau'
      if (incident.status === 'in_progress') statut = 'En cours'
      else if (incident.status === 'resolved') statut = 'Résolu'

      return {
        type: typeLabel,
        boutique: incident.shop?.name || 'Système',
        description: incident.description || incident.message,
        date: incident.createdAt,
        statut: statut
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Incidents récupérés avec succès',
      data: formattedIncidents
    })

  } catch (error) {
    console.error('❌ ShopBot Incidents API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}