/**
 * @swagger
 * /api/dashboard/finances/abonnements:
 *   get:
 *     summary: Liste des abonnements
 *     description: |
 *       Retourne la liste paginée des abonnements avec filtres.
 *       
 *       **Filtres disponibles** :
 *       - `statut` : actif, expire, desactiver
 *       - `formule` : starter, premium, entreprise
 *       - `search` : Recherche par nom de boutique
 *     tags:
 *       - Finances - Abonnements
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom de boutique
 *
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [actif, expire, desactiver]
 *
 *       - in: query
 *         name: formule
 *         schema:
 *           type: string
 *           enum: [starter, premium, entreprise]
 *
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, quarter, year]
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
 *         description: Abonnements récupérés avec succès
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
 *                             type: string
 *                           profil:
 *                             type: string
 *                           formule:
 *                             type: string
 *                           date_debut:
 *                             type: string
 *                             format: date
 *                           date_expiration:
 *                             type: string
 *                             format: date
 *                           statut:
 *                             type: string
 *                           montant_mois:
 *                             type: number
 *
 *   post:
 *     summary: Créer un nouvel abonnement
 *     description: Crée un abonnement pour une boutique
 *     tags:
 *       - Abonnements
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - abonne_id
 *               - formule
 *               - periode
 *               - date_debut
 *               - mode_paiement
 *             properties:
 *               abonne_id:
 *                 type: string
 *                 example: 64fd1234567890abcdef12345
 *               formule:
 *                 type: string
 *                 enum: [starter, premium, entreprise]
 *                 example: starter
 *               periode:
 *                 type: string
 *                 enum: [mensuelle, trimestrielle, annuelle]
 *                 example: trimestrielle
 *               date_debut:
 *                 type: string
 *                 format: date
 *                 example: 2026-01-15
 *               mode_paiement:
 *                 type: string
 *                 enum: [carte_bancaire, mobile_money, virement]
 *                 example: carte_bancaire
 *               notes:
 *                 type: string
 *                 example: Abonnement créé manuellement
 *
 *     responses:
 *       201:
 *         description: Abonnement créé avec succès
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
 *                     id:
 *                       type: string
 *                     abonne:
 *                       type: string
 *                     formule:
 *                       type: string
 *                     date_debut:
 *                       type: string
 *                     date_expiration:
 *                       type: string
 *                     statut:
 *                       type: string
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import Plan from 'src/@apiCore/models/plan'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_financier'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    if (req.method === 'GET') {
      return await getSubscriptions(req, res)
    } else if (req.method === 'POST') {
      return await createSubscription(req, res)
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Abonnements API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// GET - Liste des abonnements
async function getSubscriptions(req, res) {
  const { 
    search = '', 
    statut = '', 
    formule = '',
    period = 'month',
    page = 1, 
    limit = 20 
  } = req.query

  const now = new Date()

  // 🔧 Construire les filtres
  const baseFilter = {
    plan: { $exists: true }
  }

  if (search) {
    baseFilter.name = { $regex: search, $options: 'i' }
  }

  if (statut === 'actif') {
    baseFilter.active = true
    baseFilter.expire_date = { $gte: now }
  } else if (statut === 'expire') {
    baseFilter.expire_date = { $lt: now }
  } else if (statut === 'desactiver') {
    baseFilter.active = false
  }

  if (formule) {
    baseFilter['planInfo.name'] = formule
  }

  // Récupérer les abonnements
  const subscriptions = await Shop.aggregate([
    { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
    { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
    { $match: baseFilter },
    { $sort: { createdAt: -1 }},
    { $skip: (parseInt(page) - 1) * parseInt(limit) },
    { $limit: parseInt(limit) }
  ])

  const total = await Shop.aggregate([
    { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
    { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
    { $match: baseFilter },
    { $count: 'total' }
  ])

  // Formater les abonnements
  const formattedSubscriptions = subscriptions.map(sub => {
    let statut = 'actif'
    if (!sub.active) statut = 'desactiver'
    else if (sub.expire_date && sub.expire_date < now) statut = 'expire'

    return {
      id: sub._id,
      abonne: sub.name,
      profil: getTypeLabel(sub.type),
      formule: sub.planInfo?.name || 'Gratuit',
      date_debut: sub.subscription_date?.toISOString().split('T')[0] || '-',
      date_expiration: sub.expire_date?.toISOString().split('T')[0] || '-',
      statut: statut,
      montant_mois: sub.planInfo?.price || 0
    }
  })

  const totalCount = total[0]?.total || 0

  return res.status(200).json({
    success: true,
    message: 'Abonnements récupérés avec succès',
    data: {
      data: formattedSubscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        total_pages: Math.ceil(totalCount / parseInt(limit))
      }
    }
  })
}

// POST - Créer un abonnement
async function createSubscription(req, res) {
  const { 
    abonne_id, 
    formule, 
    periode, 
    date_debut, 
    mode_paiement,
    notes 
  } = req.body

  // Validation
  if (!abonne_id || !formule || !periode || !date_debut || !mode_paiement) {
    return res.status(400).json({
      success: false,
      message: 'Tous les champs obligatoires doivent être remplis'
    })
  }

  if (!Types.ObjectId.isValid(abonne_id)) {
    return res.status(400).json({
      success: false,
      message: 'ID abonné invalide'
    })
  }

  // Trouver le plan
  const plan = await Plan.findOne({ 
    name: { $regex: new RegExp(formule, 'i') }
  })

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: 'Plan non trouvé'
    })
  }

  // Calculer la date d'expiration
  const startDate = new Date(date_debut)
  const expireDate = new Date(startDate)
  
  if (periode === 'mensuelle') {
    expireDate.setMonth(expireDate.getMonth() + 1)
  } else if (periode === 'trimestrielle') {
    expireDate.setMonth(expireDate.getMonth() + 3)
  } else if (periode === 'annuelle') {
    expireDate.setFullYear(expireDate.getFullYear() + 1)
  }

  // Mettre à jour la boutique
  const shop = await Shop.findByIdAndUpdate(
    abonne_id,
    {
      plan: plan._id,
      subscription_date: startDate,
      expire_date: expireDate,
      active: true,
      renewed: false
    },
    { new: true }
  ).populate('plan')

  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Boutique non trouvée'
    })
  }

  // TODO: Créer un enregistrement de paiement

  return res.status(201).json({
    success: true,
    message: 'Abonnement créé avec succès',
    data: {
      id: shop._id,
      abonne: shop.name,
      formule: shop.plan?.name || formule,
      date_debut: startDate.toISOString().split('T')[0],
      date_expiration: expireDate.toISOString().split('T')[0],
      statut: 'actif',
      montant_mois: shop.plan?.price || 0
    }
  })
}

// Helper pour les labels de type
function getTypeLabel(type) {
  const labels = {
    'product': 'E-commerçant',
    'marchand': 'E-commerçant',
    'ecommerce': 'E-commerçant',
    'delivery': 'Prestataire',
    'livraison': 'Prestataire',
    'service': 'Prestataire',
    'prestataire': 'Prestataire'
  }
  return labels[type] || type
}