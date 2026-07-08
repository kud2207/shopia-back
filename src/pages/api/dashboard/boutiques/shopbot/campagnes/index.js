/**
 * @swagger
 * /api/boutiques/shopbot/campagnes:
 *   get:
 *     summary: Campagnes WhatsApp actives
 *     description: Liste les campagnes WhatsApp en cours et planifiées
 *     tags:
 *       - Boutiques - ShopBot
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, planifiee, terminee]
 *           default: all
 *
 *     responses:
 *       200:
 *         description: Campagnes récupérées avec succès
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
 *                       nom:
 *                         type: string
 *                       boutique:
 *                         type: string
 *                       statut:
 *                         type: string
 *                         enum: [Active, Planifiée, Pause, Terminée]
 *                       date_debut:
 *                         type: string
 *                         format: date
 *                       date_fin:
 *                         type: string
 *                         format: date
 *                       destinataires:
 *                         type: integer
 *                       taux_ouverture:
 *                         type: number
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Campaign from 'src/@apiCore/models/campaign'
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

    const { boutique_id, status = 'all' } = req.query

    // 🔧 Construire les filtres
    const baseFilter = {
      type: 'whatsapp'
    }

    if (boutique_id && Types.ObjectId.isValid(boutique_id)) {
      baseFilter.shop = new Types.ObjectId(boutique_id)
    }

    if (status !== 'all') {
      if (status === 'active') baseFilter.status = 'active'
      else if (status === 'planifiee') baseFilter.status = 'scheduled'
      else if (status === 'terminee') baseFilter.status = 'completed'
    }

    // Récupérer les campagnes
    const campaigns = await Campaign.find(baseFilter)
      .populate('shop', 'name')
      .sort({ createdAt: -1 })

    // Formater les campagnes
    const formattedCampaigns = campaigns.map(campaign => {
      let statut = 'Active'
      if (campaign.status === 'scheduled') statut = 'Planifiée'
      else if (campaign.status === 'paused') statut = 'Pause'
      else if (campaign.status === 'completed') statut = 'Terminée'

      return {
        nom: campaign.name,
        boutique: campaign.shop?.name || 'Toutes boutiques',
        statut: statut,
        date_debut: campaign.startDate?.toISOString().split('T')[0] || '-',
        date_fin: campaign.endDate?.toISOString().split('T')[0] || '-',
        destinataires: campaign.recipients || 0,
        taux_ouverture: campaign.openRate || 0
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Campagnes WhatsApp récupérées avec succès',
      data: formattedCampaigns
    })

  } catch (error) {
    console.error('❌ ShopBot Campagnes API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}