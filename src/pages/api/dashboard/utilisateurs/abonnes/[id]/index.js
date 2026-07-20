/**
 * @swagger
 * /api/dashboard/utilisateurs/abonnes/{id}:
 *   put:
 *     summary: Modifier un compte abonné
 *     description: |
 *       Met à jour les informations d'un compte abonné.
 *       
 *       **Règles métier** :
 *       - Logger les modifications dans audit_log
 *       - Si changement de plan ➡️ mise à jour de la date d'expiration
 *       - Notification à l'abonné si changement important
 *     tags:
 *       - Utilisateurs
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du compte abonné
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom_complet:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               whatsapp:
 *                 type: string
 *               profil:
 *                 type: string
 *                 enum: [e-commerçant, livreur, prestataire]
 *               plan_abonnement:
 *                 type: string
 *                 enum: [starter, premium, entreprise]
 *               nom_boutique:
 *                 type: string
 *               notes:
 *                 type: string
 *               statut:
 *                 type: string
 *                 enum: [actif, suspendu]
 *
 *     responses:
 *       200:
 *         description: Compte mis à jour avec succès
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
 *                     nom_complet:
 *                       type: string
 *                     email:
 *                       type: string
 *                     profil:
 *                       type: string
 *                     plan:
 *                       type: string
 *                     date_expiration:
 *                       type: string
 *                       format: date
 *
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *
 *       403:
 *         description: Permissions insuffisantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'
import Shop from 'src/@apiCore/models/shop'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query
    const { 
      nom_complet,
      email,
      whatsapp,
      profil,
      plan_abonnement,
      nom_boutique,
      notes,
      statut
    } = req.body

    // Vérifier l'ID
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID invalide'
      })
    }

    // Récupérer l'utilisateur et la boutique
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Compte abonné non trouvé'
      })
    }

    const shop = await Shop.findOne({ owner: id })
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Boutique associée non trouvée'
      })
    }

    // Enregistrer les modifications pour l'audit
    const changes = []
    if (nom_complet && nom_complet !== user.name) {
      changes.push(`Nom modifié de "${user.name}" à "${nom_complet}"`)
      user.name = nom_complet
    }

    if (email && email !== user.email) {
      changes.push(`Email modifié de "${user.email}" à "${email}"`)
      user.email = email.toLowerCase()
    }

    if (whatsapp && whatsapp !== user.whatsapp) {
      changes.push(`WhatsApp modifié de "${user.whatsapp}" à "${whatsapp}"`)
      user.whatsapp = whatsapp
    }

    if (profil && profil !== getShopType(user.role)) {
      changes.push(`Profil modifié de "${getShopType(user.role)}" à "${profil}"`)
      user.role = getRoleFromProfil(profil)
    }

    if (plan_abonnement && plan_abonnement !== shop.planInfo?.name) {
      changes.push(`Plan modifié de "${shop.planInfo?.name}" à "${plan_abonnement}"`)
      
      // Mettre à jour la date d'expiration
      const expirationDate = new Date()
      if (plan_abonnement === 'starter') expirationDate.setMonth(expirationDate.getMonth() + 1)
      else if (plan_abonnement === 'premium') expirationDate.setMonth(expirationDate.getMonth() + 3)
      else if (plan_abonnement === 'entreprise') expirationDate.setFullYear(expirationDate.getFullYear() + 1)
      
      shop.expire_date = expirationDate
      shop.plan = await getPlanId(plan_abonnement)
    }

    if (nom_boutique && nom_boutique !== shop.name) {
      changes.push(`Nom de boutique modifié de "${shop.name}" à "${nom_boutique}"`)
      shop.name = nom_boutique
    }

    if (notes !== undefined && notes !== shop.notes) {
      changes.push('Notes modifiées')
      shop.notes = notes
    }

    if (statut && statut !== (user.active ? 'actif' : 'suspendu')) {
      changes.push(`Statut modifié de "${user.active ? 'actif' : 'suspendu'}" à "${statut}"`)
      user.active = statut === 'actif'
    }

    // Sauvegarder les modifications
    await user.save()
    await shop.save()

    // Enregistrer dans l'audit log
    if (changes.length > 0) {
      const audit = new AuditLog({
        userId: auth.admin._id,
        action: 'MODIFY_ACCOUNT',
        targetId: user._id,
        details: changes.join('; '),
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      })
      await audit.save()
    }

    // Envoyer une notification si changement important
    if (plan_abonnement || statut) {
      // TODO: Envoyer notification à l'abonné
    }

    // Retourner la réponse
    return res.status(200).json({
      success: true,
      message: 'Compte mis à jour avec succès',
      data: {
        id: user._id,
        nom_complet: user.name,
        email: user.email,
        profil: getShopType(user.role),
        plan: shop.planInfo?.name,
        date_expiration: shop.expire_date?.toISOString().split('T')[0]
      }
    })

  } catch (error) {
    console.error('❌ Modification compte abonné API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// Helper pour obtenir le type de boutique
function getShopType(role) {
  if (role === 'admin_commercial') return 'e-commerçant'
  if (role === 'livreur') return 'livreur'
  if (role === 'prestataire') return 'prestataire'
  return 'e-commerçant'
}

// Helper pour obtenir le rôle à partir du profil
function getRoleFromProfil(profil) {
  if (profil === 'e-commerçant') return 'admin_commercial'
  if (profil === 'livreur') return 'livreur'
  if (profil === 'prestataire') return 'prestataire'
  return 'admin_commercial'
}

// Helper pour obtenir l'ID du plan
async function getPlanId(planName) {
  const Plan = require('src/@apiCore/models/plan')
  const plan = await Plan.findOne({ name: planName })
  return plan?._id
}