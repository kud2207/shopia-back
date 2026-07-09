/**
 * @swagger
 * /api/dashboard/finances/abonnements/{id}:
 *   get:
 *     summary: Détails d'un abonnement
 *     description: Retourne les détails complets d'un abonnement
 *     tags:
 *       - Finances - Abonnements
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'abonnement
 *
 *     responses:
 *       200:
 *         description: Détails de l'abonnement
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
 *                     id:
 *                       type: string
 *                     abonne:
 *                       type: string
 *                     email:
 *                       type: string
 *                     telephone:
 *                       type: string
 *                     whatsapp:
 *                       type: string
 *                     plan:
 *                       type: string
 *                     statut:
 *                       type: string
 *                     date_expiration:
 *                       type: string
 *                       format: date
 *
 *   patch:
 *     summary: Modifier un abonnement
 *     description: Met à jour la formule, le statut ou la date d'expiration
 *     tags:
 *       - Abonnements
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               formule:
 *                 type: string
 *               statut:
 *                 type: string
 *               date_expiration:
 *                 type: string
 *                 format: date
 *
 *     responses:
 *       200:
 *         description: Abonnement mis à jour
 *
 *   delete:
 *     summary: Supprimer un abonnement (soft delete)
 *     description: |
 *       Supprime définitivement un abonnement (super admin uniquement).
 *       Archive l'abonnement et désactive l'accès immédiatement.
 *     tags:
 *       - Abonnements
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
 *         description: Abonnement supprimé
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

    const { id } = req.query

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID abonnement invalide'
      })
    }

    if (req.method === 'GET') {
      return await getSubscriptionDetails(req, res, id)
    } else if (req.method === 'PATCH') {
      return await updateSubscription(req, res, id)
    } else if (req.method === 'DELETE') {
      return await deleteSubscription(req, res, id, auth.admin)
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Subscription Details API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// GET - Détails de l'abonnement
async function getSubscriptionDetails(req, res, id) {
  const shop = await Shop.findById(id)
    .populate('plan')
    .populate('owner', 'name email phone')

  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Abonnement non trouvé'
    })
  }

  const now = new Date()
  let statut = 'actif'
  if (!shop.active) statut = 'desactiver'
  else if (shop.expire_date && shop.expire_date < now) statut = 'expire'

  return res.status(200).json({
    success: true,
    data: {
      id: shop._id,
      abonne: shop.name,
      email: shop.owner?.email || shop.email || '',
      telephone: shop.phone || '',
      whatsapp: shop.whatsapp || '',
      plan: shop.plan?.name || 'Gratuit',
      statut: statut,
      date_expiration: shop.expire_date?.toISOString().split('T')[0] || '-',
      date_debut: shop.subscription_date?.toISOString().split('T')[0] || '-',
      montant_mois: shop.plan?.price || 0
    }
  })
}

// PATCH - Mettre à jour l'abonnement
async function updateSubscription(req, res, id) {
  const { formule, statut, date_expiration } = req.body

  const shop = await Shop.findById(id)
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Abonnement non trouvé'
    })
  }

  // Mettre à jour la formule
  if (formule) {
    const plan = await Plan.findOne({ 
      name: { $regex: new RegExp(formule, 'i') }
    })
    
    if (plan) {
      shop.plan = plan._id
    }
  }

  // Mettre à jour le statut
  if (statut === 'desactiver') {
    shop.active = false
  } else if (statut === 'actif') {
    shop.active = true
  }

  // Mettre à jour la date d'expiration
  if (date_expiration) {
    shop.expire_date = new Date(date_expiration)
  }

  await shop.save()

  return res.status(200).json({
    success: true,
    message: 'Abonnement mis à jour avec succès',
    data: {
      id: shop._id,
      formule: shop.plan?.name,
      statut: shop.active ? 'actif' : 'desactiver',
      date_expiration: shop.expire_date?.toISOString().split('T')[0]
    }
  })
}

// DELETE - Supprimer (soft delete)
async function deleteSubscription(req, res, id, admin) {
  // Vérifier que c'est un super admin
  if (admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Seul un super admin peut supprimer un abonnement'
    })
  }

  const shop = await Shop.findById(id)
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Abonnement non trouvé'
    })
  }

  // Soft delete - Archiver et désactiver
  shop.active = false
  shop.isDelete = true
  shop.deletedAt = new Date()
  shop.deletedBy = admin._id
  
  await shop.save()

  // TODO: Logger l'action dans un audit log

  return res.status(200).json({
    success: true,
    message: 'Abonnement supprimé et archivé avec succès',
    data: {
      id: shop._id,
      abonne: shop.name
    }
  })
}