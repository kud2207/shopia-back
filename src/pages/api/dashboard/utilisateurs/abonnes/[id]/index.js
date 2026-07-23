import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'
import Shop from 'src/@apiCore/models/shop'
import Plan from 'src/@apiCore/models/plan'
import AuditLog from 'src/@apiCore/models/auditLog'
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
    const { id } = req.query

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' })
    }

    if (req.method === 'GET') return await getSubscriberDetails(req, res, id)
    if (req.method === 'PUT') return await updateSubscriber(req, res, id, auth.admin)
    if (req.method === 'DELETE') return await deleteSubscriber(req, res, id, auth.admin)

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Abonnés [id] API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}

// ==========================================
// 1. GET : Détails d'un abonné
// ==========================================
async function getSubscriberDetails(req, res, id) {
  // ⚠️ CORRECTION : On cherche par _id du shop OU par le champ 'user'
  const shop = await Shop.findOne({ $or: [{ _id: id }, { user: id }] })
  
  if (!shop) {
    return res.status(404).json({ success: false, message: 'Compte abonné non trouvé' })
  }

  // Récupérer l'utilisateur manuellement via le champ 'user'
  let userData = { name: shop.name, email: '', phone: '' }
  
  if (shop.user) {
    const user = await User.findById(shop.user).select('name first_name last_name email phone role')
    if (user) {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.name
      userData = { 
        name: fullName, 
        email: user.email || '', 
        phone: user.phone || '', 
        role: user.role 
      }
    }
  }

  // Récupérer le plan manuellement
  let planName = 'Gratuit'
  if (shop.plan) {
    const plan = await Plan.findById(shop.plan).select('name')
    if (plan) planName = plan.name
  }

  const now = new Date()
  let statut = 'Actif'
  if (!shop.active) statut = 'Suspendu'
  else if (shop.expire_date && new Date(shop.expire_date) < now) statut = 'Expiré'

  return res.status(200).json({
    success: true,
    data: {
      id: shop._id,
      nom_complet: userData.name || 'Non renseigné',
      email: userData.email,
      whatsapp: userData.phone, // On mappe phone vers whatsapp pour ton frontend
      nom_boutique: shop.name,
      profil: getShopType(userData.role),
      plan: planName,
      statut: statut,
      date_creation: shop.createdAt?.toISOString().split('T')[0] || '-',
      date_expiration: shop.expire_date?.toISOString().split('T')[0] || '-',
      notes: shop.description || '' // On utilise description car 'notes' n'existe pas dans ton schéma
    }
  })
}

// ==========================================
// 2. PUT : Modifier un abonné
// ==========================================
async function updateSubscriber(req, res, id, admin) {
  const { nom_complet, email, whatsapp, profil, plan_abonnement, nom_boutique, notes, statut } = req.body

  const shop = await Shop.findOne({ $or: [{ _id: id }, { user: id }] })
  if (!shop) return res.status(404).json({ success: false, message: 'Compte abonné non trouvé' })

  let user = null
  if (shop.user) user = await User.findById(shop.user)

  const changes = []
  
  if (user) {
    if (nom_complet && nom_complet !== user.name) {
      changes.push(`Nom modifié de "${user.name}" à "${nom_complet}"`)
      user.name = nom_complet
    }
    if (email && email !== user.email) {
      changes.push(`Email modifié de "${user.email}" à "${email}"`)
      user.email = email.toLowerCase()
    }
    if (whatsapp && whatsapp !== user.phone) {
      changes.push(`Téléphone modifié de "${user.phone}" à "${whatsapp}"`)
      user.phone = whatsapp
    }
    if (profil && profil !== getShopType(user.role)) {
      changes.push(`Profil modifié de "${getShopType(user.role)}" à "${profil}"`)
      user.role = getRoleFromProfil(profil)
    }
    if (statut && statut !== (user.active ? 'actif' : 'suspendu')) {
      changes.push(`Statut modifié de "${user.active ? 'actif' : 'suspendu'}" à "${statut}"`)
      user.active = statut === 'actif'
    }
    await user.save()
  }

  // Mise à jour du shop
  if (nom_boutique && nom_boutique !== shop.name) {
    changes.push(`Nom boutique modifié de "${shop.name}" à "${nom_boutique}"`)
    shop.name = nom_boutique
  }
  if (notes !== undefined && notes !== shop.description) {
    changes.push('Description modifiée')
    shop.description = notes
  }
  if (statut && statut !== (shop.active ? 'actif' : 'suspendu')) {
    changes.push(`Statut boutique modifié à "${statut}"`)
    shop.active = statut === 'actif'
  }

  if (plan_abonnement) {
    const currentPlan = shop.plan ? (await Plan.findById(shop.plan))?.name : 'Gratuit'
    if (plan_abonnement !== currentPlan) {
      changes.push(`Plan modifié de "${currentPlan}" à "${plan_abonnement}"`)
      const expirationDate = new Date()
      if (plan_abonnement === 'starter') expirationDate.setMonth(expirationDate.getMonth() + 1)
      else if (plan_abonnement === 'premium') expirationDate.setMonth(expirationDate.getMonth() + 3)
      else if (plan_abonnement === 'entreprise') expirationDate.setFullYear(expirationDate.getFullYear() + 1)
      
      shop.expire_date = expirationDate
      const planDoc = await Plan.findOne({ name: plan_abonnement })
      shop.plan = planDoc?._id
    }
  }

  await shop.save()

  if (changes.length > 0) {
    await new AuditLog({
      userId: admin._id,
      action: 'MODIFY_ACCOUNT',
      targetId: shop._id,
      targetModel: 'Shop',
      details: { changes: changes.join('; ') },
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }).save()
  }

  const updatedPlan = shop.plan ? await Plan.findById(shop.plan) : null
  const finalUser = user || { name: shop.name, email: '', phone: '', role: 'admin_commercial' }

  return res.status(200).json({
    success: true,
    message: 'Compte mis à jour avec succès',
    data: {
      id: shop._id,
      nom_complet: finalUser.name,
      email: finalUser.email,
      profil: getShopType(finalUser.role),
      plan: updatedPlan?.name,
      date_expiration: shop.expire_date?.toISOString().split('T')[0]
    }
  })
}

// ==========================================
// 3. DELETE : Supprimer un abonné (Soft Delete)
// ==========================================
async function deleteSubscriber(req, res, id, admin) {
  const shop = await Shop.findOne({ $or: [{ _id: id }, { user: id }] })
  if (!shop) return res.status(404).json({ success: false, message: 'Compte abonné non trouvé' })

  let user = null
  if (shop.user) user = await User.findById(shop.user)

  if (user) {
    user.isDelete = true
    user.deletedAt = new Date()
    user.deletedBy = admin._id
    user.name = `Supprimé_${user.name}`
    user.email = `supprime_${user._id}@shopia.com`
    user.active = false
    await user.save()
  }

  shop.isDelete = true
  shop.deletedAt = new Date()
  shop.deletedBy = admin._id
  shop.name = `Supprimé_${shop.name}`
  shop.active = false
  await shop.save()

  await new AuditLog({
    userId: admin._id,
    action: 'DELETE_ADMIN', 
    targetId: shop._id,
    targetModel: 'Shop',
    details: { action: 'Suppression définitive (soft delete)' },
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
  }).save()

  return res.status(200).json({ success: true, message: 'Compte supprimé avec succès', data: { id: shop._id } })
}

// ==========================================
// Helpers
// ==========================================
function getShopType(role) {
  if (!role) return 'E-commerçant'
  const val = role.toLowerCase()
  if (val.includes('commercial') || val.includes('ecommerce') || val.includes('product') || val.includes('marchand')) return 'E-commerçant'
  if (val.includes('livreur') || val.includes('delivery')) return 'Livreur'
  if (val.includes('prestataire') || val.includes('service')) return 'Prestataire'
  return 'E-commerçant'
}

function getRoleFromProfil(profil) {
  if (profil === 'e-commerçant') return 'admin_commercial'
  if (profil === 'livreur') return 'livreur'
  if (profil === 'prestataire') return 'prestataire'
  return 'admin_commercial'
}