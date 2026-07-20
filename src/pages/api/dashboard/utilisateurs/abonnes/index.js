/**
 * @swagger
 * /api/dashboard/utilisateurs/abonnes:
 *   get:
 *     summary: Liste des abonnés avec filtres
 *     description: Retourne la liste paginée des abonnés avec filtres avancés
 *     tags:
 *       - Utilisateurs - Abonnés
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: profil
 *         schema:
 *           type: string
 *           enum: [e-commerçant, livreur, prestataire]
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [actif, suspendu, expire]
 *       - in: query
 *         name: plan
 *         schema:
 *           type: string
 *           enum: [starter, premium, entreprise]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Liste récupérée avec succès
 *
 *   post:
 *     summary: Créer un nouveau compte abonné
 *     description: |
 *       Crée un compte abonné avec boutique associée.
 *       Génère un mot de passe temporaire et envoie un email de bienvenue.
 *     tags:
 *       - Utilisateurs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom_complet
 *               - email
 *               - whatsapp
 *               - profil
 *               - plan_abonnement
 *               - nom_boutique
 *             properties:
 *               nom_complet:
 *                 type: string
 *                 example: Amina Mbarga
 *               email:
 *                 type: string
 *                 format: email
 *                 example: amina@gmail.com
 *               whatsapp:
 *                 type: string
 *                 example: +237 6xxxxxxxx
 *               profil:
 *                 type: string
 *                 enum: [e-commerçant, livreur, prestataire]
 *                 example: e-commerçant
 *               plan_abonnement:
 *                 type: string
 *                 enum: [starter, premium, entreprise]
 *                 example: starter
 *               nom_boutique:
 *                 type: string
 *                 example: Techno Kmer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'
import Shop from 'src/@apiCore/models/shop'
import Plan from 'src/@apiCore/models/plan'
import { generatePassword, sendWelcomeEmail } from 'src/@apiCore/lib/email'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    if (req.method === 'GET') {
      return await getSubscribers(req, res)
    } else if (req.method === 'POST') {
      return await createSubscriber(req, res, auth.admin)
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Abonnés API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// GET - Liste des abonnés
async function getSubscribers(req, res) {
  const { 
    search = '', 
    profil = '', 
    statut = '', 
    plan = '',
    page = 1, 
    limit = 20 
  } = req.query

  const now = new Date()

  const baseFilter = {
    plan: { $exists: true }
  }

  if (search) {
    baseFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { whatsapp: { $regex: search, $options: 'i' } }
    ]
  }

  if (profil) {
    if (profil.toLowerCase().includes('e-commerç') || profil.toLowerCase().includes('marchand')) {
      baseFilter.type = { $in: ['product', 'marchand', 'ecommerce'] }
    } else if (profil.toLowerCase().includes('livreur')) {
      baseFilter.type = { $in: ['delivery', 'livraison'] }
    } else if (profil.toLowerCase().includes('prestataire')) {
      baseFilter.type = { $in: ['service', 'prestataire'] }
    }
  }

  if (statut) {
    if (statut === 'actif') {
      baseFilter.active = true
      baseFilter.expire_date = { $gte: now }
    } else if (statut === 'suspendu') {
      baseFilter.active = false
    } else if (statut === 'expire') {
      baseFilter.expire_date = { $lt: now }
    }
  }

  const shops = await Shop.aggregate([
    { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
    { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
    { $lookup: { from: 'users', localField: 'owner', foreignField: '_id', as: 'ownerInfo' }},
    { $unwind: { path: '$ownerInfo', preserveNullAndEmptyArrays: true }},
    { $match: baseFilter },
    { $sort: { createdAt: -1 }},
    { $skip: (parseInt(page) - 1) * parseInt(limit) },
    { $limit: parseInt(limit) }
  ])

  const totalShops = await Shop.aggregate([
    { $lookup: { from: 'plans', localField: 'plan', foreignField: '_id', as: 'planInfo' }},
    { $unwind: { path: '$planInfo', preserveNullAndEmptyArrays: true }},
    { $match: baseFilter },
    { $count: 'total' }
  ])

  const total = totalShops[0]?.total || 0

  const formattedShops = shops.map(shop => {
    let statutLabel = 'Actif'
    if (!shop.active) statutLabel = 'Suspendu'
    else if (shop.expire_date && new Date(shop.expire_date) < now) statutLabel = 'Expiré'

    let profilLabel = 'E-commerçant'
    if (['delivery', 'livraison'].includes(shop.type)) profilLabel = 'Livreur'
    else if (['service', 'prestataire'].includes(shop.type)) profilLabel = 'Prestataire'

    return {
      id: shop.ownerInfo?._id || shop._id,
      nom_complet: shop.ownerInfo?.name || shop.name || 'Non renseigné',
      email: shop.email || shop.ownerInfo?.email || '',
      whatsapp: shop.whatsapp || shop.ownerInfo?.phone || '',
      profil: profilLabel,
      plan: shop.planInfo?.name || 'Gratuit',
      statut: statutLabel,
      date_expiration: shop.expire_date?.toISOString().split('T')[0] || '-',
      derniere_activite: getTimeAgo(shop.updatedAt),
      nom_boutique: shop.name
    }
  })

  return res.status(200).json({
    success: true,
    message: 'Liste des abonnés récupérée avec succès',
    data: {
      data: formattedShops,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / parseInt(limit))
      }
    }
  })
}

// POST - Créer un abonné
async function createSubscriber(req, res, admin) {
  const { 
    nom_complet,
    email,
    whatsapp,
    profil,
    plan_abonnement,
    nom_boutique,
    notes 
  } = req.body

  if (!nom_complet || !email || !whatsapp || !profil || !plan_abonnement || !nom_boutique) {
    return res.status(400).json({
      success: false,
      message: 'Tous les champs obligatoires doivent être remplis'
    })
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Cet email est déjà utilisé par un autre compte'
    })
  }

  const tempPassword = generatePassword(12)
  const hashedPassword = await User.hashPassword(tempPassword)

  let role = 'admin_support'
  if (profil === 'e-commerçant') role = 'admin_commercial'
  else if (profil === 'livreur') role = 'livreur'
  else if (profil === 'prestataire') role = 'prestataire'

  const user = new User({
    name: nom_complet,
    email: email.toLowerCase(),
    whatsapp,
    password: hashedPassword,
    role,
    active: true,
    createdFrom: 'admin_dashboard'
  })
  await user.save()

  const plan = await Plan.findOne({ name: plan_abonnement })
  const expirationDate = new Date()
  if (plan_abonnement === 'starter') expirationDate.setMonth(expirationDate.getMonth() + 1)
  else if (plan_abonnement === 'premium') expirationDate.setMonth(expirationDate.getMonth() + 3)
  else if (plan_abonnement === 'entreprise') expirationDate.setFullYear(expirationDate.getFullYear() + 1)

  const shop = new Shop({
    name: nom_boutique,
    type: getShopType(profil),
    owner: user._id,
    plan: plan?._id,
    subscription_date: new Date(),
    expire_date: expirationDate,
    active: true,
    notes
  })
  await shop.save()

  try {
    await sendWelcomeEmail({
      email: user.email,
      name: user.name,
      password: tempPassword,
      plan: plan_abonnement,
      shopName: shop.name
    })
  } catch (emailError) {
    console.error('Erreur envoi email:', emailError)
  }

  return res.status(201).json({
    success: true,
    message: 'Compte créé avec succès',
    data: {
      id: user._id,
      nom_complet: user.name,
      email: user.email,
      profil: profil,
      plan: plan_abonnement,
      date_expiration: expirationDate.toISOString().split('T')[0]
    }
  })
}

function getShopType(profil) {
  if (profil === 'e-commerçant') return 'ecommerce'
  if (profil === 'livreur') return 'delivery'
  if (profil === 'prestataire') return 'service'
  return 'ecommerce'
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  let interval = seconds / 31536000
  if (interval > 1) return `Il y a ${Math.floor(interval)} an(s)`
  interval = seconds / 2592000
  if (interval > 1) return `Il y a ${Math.floor(interval)} mois`
  interval = seconds / 86400
  if (interval > 1) return `Il y a ${Math.floor(interval)} jour(s)`
  interval = seconds / 3600
  if (interval > 1) return `Il y a ${Math.floor(interval)} heure(s)`
  interval = seconds / 60
  if (interval > 1) return `Il y a ${Math.floor(interval)} minute(s)`
  return 'À l\'instant'
}