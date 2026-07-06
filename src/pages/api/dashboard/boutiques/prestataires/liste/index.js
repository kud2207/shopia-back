/**
 * @swagger
 * /api/boutiques/prestataires/liste:
 *   get:
 *     summary: Liste des prestataires de service
 *     description: Tableau de suivi détaillé par prestataire avec toutes les métriques
 *     tags:
 *       - Prestataires
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, medecin, hotel, restaurant, salon, autre]
 *           default: all
 *
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom de prestataire
 *
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *           default: month
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
 *         description: Prestataires récupérés avec succès
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
 *                           prestataire:
 *                             type: string
 *                           type:
 *                             type: string
 *                           rdv_actifs:
 *                             type: integer
 *                           reservations:
 *                             type: integer
 *                           taux_occupation:
 *                             type: number
 *                           annules_non_honores:
 *                             type: integer
 *                           bot_whatsapp:
 *                             type: string
 *                             enum: [actif, inactif]
 *                           campagnes:
 *                             type: integer
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import Appointment from 'src/@apiCore/models/appointment'
import Campaign from 'src/@apiCore/models/campaign'
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

    const { 
      type = 'all', 
      search = '', 
      period = 'month',
      page = 1, 
      limit = 20 
    } = req.query

    // 📅 Calculer la période
    const now = new Date()
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1)

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      startDate = weekAgo
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
    }

    // 🔧 Construire les filtres
    const baseFilter = {
      type: { $in: ['service', 'prestataire', 'medecin', 'hotel', 'restaurant', 'salon'] }
    }

    if (type !== 'all') {
      if (type === 'medecin') baseFilter.type = { $in: ['medecin', 'medical', 'clinique'] }
      else if (type === 'hotel') baseFilter.type = 'hotel'
      else if (type === 'restaurant') baseFilter.type = 'restaurant'
      else baseFilter.type = type
    }

    if (search) {
      baseFilter.name = { $regex: search, $options: 'i' }
    }

    // Récupérer les prestataires
    const providers = await Shop.find(baseFilter)
      .sort({ name: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    const total = await Shop.countDocuments(baseFilter)

    // Calculer les stats pour chaque prestataire
    const providersWithStats = await Promise.all(
      providers.map(async (provider) => {
        // RDV actifs
        const activeAppointments = await Appointment.countDocuments({
          service: provider._id,
          status: { $in: ['confirmed', 'pending'] },
          createdAt: { $gte: startDate }
        })

        // Réservations totales
        const totalReservations = await Appointment.countDocuments({
          service: provider._id,
          createdAt: { $gte: startDate }
        })

        // Taux d'occupation
        const totalSlots = await Appointment.countDocuments({
          service: provider._id,
          createdAt: { $gte: startDate }
        })

        const bookedSlots = await Appointment.countDocuments({
          service: provider._id,
          status: { $in: ['confirmed', 'completed'] },
          createdAt: { $gte: startDate }
        })

        const occupancyRate = totalSlots > 0
          ? parseFloat(((bookedSlots / totalSlots) * 100).toFixed(1))
          : 0

        // Annulés et non honorés
        const cancelledNoShow = await Appointment.countDocuments({
          service: provider._id,
          status: { $in: ['cancelled', 'no_show'] },
          createdAt: { $gte: startDate }
        })

        // Campagnes WhatsApp
        const campaignsCount = await Campaign.countDocuments({
          shop: provider._id,
          type: 'whatsapp',
          status: { $in: ['active', 'scheduled'] }
        })

        // Statut bot WhatsApp
        const botWhatsapp = provider.whatsappBotActive ? 'actif' : 'inactif'

        return {
          id: provider._id,
          prestataire: provider.name,
          type: getTypeLabel(provider.type),
          rdv_actifs: activeAppointments,
          reservations: totalReservations,
          taux_occupation: occupancyRate,
          annules_non_honores: cancelledNoShow,
          bot_whatsapp: botWhatsapp,
          campagnes: campaignsCount
        }
      })
    )

    return res.status(200).json({
      success: true,
      message: 'Prestataires récupérés avec succès',
      data: {
        data: providersWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }
    })

  } catch (error) {
    console.error('❌ Prestataires Liste API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// Helper pour les labels de type
function getTypeLabel(type) {
  const labels = {
    'medecin': 'Médecin',
    'medical': 'Médecin',
    'clinique': 'Médecin',
    'hotel': 'Hôtel',
    'restaurant': 'Restaurant',
    'salon': 'Salon',
    'service': 'Service',
    'prestataire': 'Prestataire'
  }
  return labels[type] || type
}