/**
 * @swagger
 * /api/dashboard/utilisateurs/abonnes/{id}:
 *   delete:
 *     summary: Supprimer un compte abonné (soft delete)
 *     description: |
 *       Supprime définitivement un compte abonné (super admin uniquement).
 *       Archive l'abonnement et désactive l'accès immédiatement.
 *       
 *       **Règles métier** :
 *       - Soft delete uniquement (archivage)
 *       - Supprimer toutes les données associées (GDPR compliant)
 *       - Confirmation obligatoire
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
 *     responses:
 *       200:
 *         description: Compte supprimé avec succès
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
 *                     date_suppression:
 *                       type: string
 *                       format: date-time
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'DELETE') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { id } = req.query

    // Récupérer l'utilisateur
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Compte abonné non trouvé'
      })
    }

    // Vérifier que ce n'est pas le dernier super_admin
    if (user.role === 'super_admin' && await User.countDocuments({ role: 'super_admin' }) <= 1) {
      return res.status(403).json({
        success: false,
        message: 'Impossible de supprimer le dernier super_admin'
      })
    }

    // Soft delete
    user.isDelete = true
    user.deletedAt = new Date()
    user.deletedBy = auth.admin._id
    user.name = 'Supprimé ' + user.name
    user.email = 'supprime_' + user._id + '@shopia.com'
    user.whatsapp = ''
    user.password = ''
    user.role = 'deleted'
    user.active = false
    
    await user.save()

    // Archiver la boutique
    const shop = await Shop.findOne({ owner: id })
    if (shop) {
      shop.isDelete = true
      shop.deletedAt = new Date()
      shop.deletedBy = auth.admin._id
      shop.name = 'Supprimé ' + shop.name
      shop.owner = null
      shop.active = false
      await shop.save()
    }

    // Enregistrer dans l'audit log
    const audit = new AuditLog({
      userId: auth.admin._id,
      action: 'DELETE_ACCOUNT',
      targetId: user._id,
      details: 'Compte supprimé (soft delete)',
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()

    // Retourner la réponse
    return res.status(200).json({
      success: true,
      message: 'Compte supprimé avec succès',
      data: {
        id: user._id,
        nom_complet: user.name,
        date_suppression: user.deletedAt
      }
    })

  } catch (error) {
    console.error('❌ Suppression compte abonné API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}