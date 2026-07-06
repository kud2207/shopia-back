/**
 * @swagger
 * /api/dashboard/admins/register/{id}:
 *   get:
 *     summary: Voir un administrateur par ID
 *     description: Récupère les détails d'un administrateur spécifique
 *     tags:
 *       - Admin Authentication
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB de l'administrateur
 *         example: 64fd1234567890abcdef12345
 *
 *     responses:
 *       200:
 *         description: Administrateur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Administrateur récupéré avec succès
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64fd1234567890abcdef12345
 *
 *                     nom:
 *                       type: string
 *                       example: Kageu
 *
 *                     prenom:
 *                       type: string
 *                       example: Ultiche
 *
 *                     email:
 *                       type: string
 *                       example: ultiche@shopia.com
 *
 *                     role:
 *                       type: string
 *                       example: super_admin
 *
 *                     active:
 *                       type: boolean
 *                       example: true
 *
 *                     avatar:
 *                       type: string
 *                       example: /images/avatars/admin.png
 *
 *                     authProvider:
 *                       type: string
 *                       example: local
 *
 *                     permissions:
 *                       type: object
 *                       properties:
 *                         dashboard:
 *                           type: boolean
 *                           example: true
 *                         boutiques:
 *                           type: boolean
 *                           example: true
 *                         finances:
 *                           type: boolean
 *                           example: true
 *                         utilisateurs:
 *                           type: boolean
 *                           example: true
 *                         tickets:
 *                           type: boolean
 *                           example: true
 *                         rapports:
 *                           type: boolean
 *                           example: true
 *
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *
 *       400:
 *         description: ID invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: ID d'administrateur invalide
 *
 *       401:
 *         description: Token d'authentification requis
 *
 *       403:
 *         description: Permissions insuffisantes (rôle super_admin requis)
 *
 *       404:
 *         description: Administrateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Administrateur non trouvé
 *
 *       405:
 *         description: Méthode non autorisée
 *
 *       500:
 *         description: Erreur serveur
 *
 *   patch:
 *     summary: Modifier un administrateur
 *     description: |
 *       Modifie les informations d'un administrateur.
 *       
 *       **Restrictions** :
 *       - Un admin ne peut pas modifier son propre rôle
 *       - Un admin ne peut pas désactiver son propre compte
 *     tags:
 *       - Admin Authentication
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB de l'administrateur
 *         example: 64fd1234567890abcdef12345
 *
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *                 minLength: 2
 *                 example: Kageu
 *
 *               prenom:
 *                 type: string
 *                 minLength: 2
 *                 example: Ultiche
 *
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ultiche@shopia.com
 *
 *               role:
 *                 type: string
 *                 enum:
 *                   - super_admin
 *                   - admin_support
 *                   - admin_financier
 *                   - admin_commercial
 *                 example: admin_financier
 *
 *               active:
 *                 type: boolean
 *                 example: true
 *
 *               avatar:
 *                 type: string
 *                 example: /images/avatars/custom.png
 *
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: Nouveau mot de passe (min 6 caractères)
 *                 example: NouveauMotDePasse123
 *
 *     responses:
 *       200:
 *         description: Administrateur mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Administrateur mis à jour avec succès
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64fd1234567890abcdef12345
 *
 *                     nom:
 *                       type: string
 *                       example: Kageu
 *
 *                     prenom:
 *                       type: string
 *                       example: Ultiche
 *
 *                     email:
 *                       type: string
 *                       example: ultiche@shopia.com
 *
 *                     role:
 *                       type: string
 *                       example: admin_financier
 *
 *                     active:
 *                       type: boolean
 *                       example: true
 *
 *                     avatar:
 *                       type: string
 *                       example: /images/avatars/custom.png
 *
 *                     authProvider:
 *                       type: string
 *                       example: local
 *
 *                     permissions:
 *                       type: object
 *                       properties:
 *                         dashboard:
 *                           type: boolean
 *                           example: true
 *                         boutiques:
 *                           type: boolean
 *                           example: false
 *                         finances:
 *                           type: boolean
 *                           example: true
 *                         utilisateurs:
 *                           type: boolean
 *                           example: false
 *                         tickets:
 *                           type: boolean
 *                           example: false
 *                         rapports:
 *                           type: boolean
 *                           example: true
 *
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Erreurs de validation
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Données invalides
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - Le mot de passe doit contenir au moins 6 caractères
 *
 *                 - type: object
 *                   description: Email déjà utilisé
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Cet email est déjà utilisé
 *
 *                 - type: object
 *                   description: Mot de passe trop court
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Le mot de passe doit contenir au moins 6 caractères
 *
 *       401:
 *         description: Token d'authentification requis
 *
 *       403:
 *         description: Modification non autorisée
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Modification de son propre rôle
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Vous ne pouvez pas modifier votre propre rôle
 *
 *                 - type: object
 *                   description: Désactivation de son propre compte
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Vous ne pouvez pas désactiver votre propre compte
 *
 *       404:
 *         description: Administrateur non trouvé
 *
 *       405:
 *         description: Méthode non autorisée
 *
 *       500:
 *         description: Erreur serveur
 *
 *   delete:
 *     summary: Supprimer un administrateur
 *     description: |
 *       Supprime définitivement un administrateur.
 *       
 *       **Restrictions** :
 *       - Un admin ne peut pas supprimer son propre compte
 *       - Impossible de supprimer le dernier super_admin actif
 *     tags:
 *       - Admin Authentication
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB de l'administrateur à supprimer
 *         example: 64fd1234567890abcdef12345
 *
 *     responses:
 *       200:
 *         description: Administrateur supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Administrateur supprimé avec succès
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 64fd1234567890abcdef12345
 *
 *       400:
 *         description: ID invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: ID d'administrateur invalide
 *
 *       401:
 *         description: Token d'authentification requis
 *
 *       403:
 *         description: Suppression non autorisée
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Auto-suppression
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Vous ne pouvez pas supprimer votre propre compte
 *
 *                 - type: object
 *                   description: Dernier super_admin
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Impossible de supprimer le dernier super_admin actif
 *
 *       404:
 *         description: Administrateur non trouvé
 *
 *       405:
 *         description: Méthode non autorisée
 *
 *       500:
 *         description: Erreur serveur
 */

import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { validateAdminData } from 'src/@apiCore/middlewares/validateAdmin'
import Admin from 'src/@apiCore/models/admin'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })

  try {
    // 🛡️ Auth : super_admin requis
    const auth = await withAuth({ 
      roles: ['super_admin']
    })(req, res)

    if (auth.error) return auth.error

    const { admin: currentAdmin } = auth
    const { id } = req.query

    // 🔍 Validation de l'ID
    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID d\'administrateur invalide' })
    }

    switch (req.method) {
      case 'GET':
        return await getAdminById(req, res, id)
      case 'PATCH':
        return await updateAdmin(req, res, id, currentAdmin)
      case 'DELETE':
        return await deleteAdmin(req, res, id, currentAdmin)
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' })
    }
  } catch (error) {
    console.error('Admin by ID API error:', error)
    return res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    })
  }
}

// 🔍 GET - Récupérer un admin par ID
async function getAdminById(req, res, id) {
  try {
    const admin = await Admin.findById(id).select('-password')
    
    if (!admin) {
      return res.status(404).json({ message: 'Administrateur non trouvé' })
    }

    return res.status(200).json({
      message: 'Administrateur récupéré avec succès',
      data: admin
    })
  } catch (error) {
    console.error('Get admin by ID error:', error)
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération',
      error: error.message 
    })
  }
}

// ✏️ PATCH - Mise à jour
async function updateAdmin(req, res, id, currentAdmin) {
  try {
    const { nom, prenom, email, role, active, avatar, newPassword } = req.body

    const admin = await Admin.findById(id)
    
    if (!admin) {
      return res.status(404).json({ message: 'Administrateur non trouvé' })
    }

    // 🔒 Protections
    const isSelf = admin._id.toString() === currentAdmin._id.toString()

    if (isSelf && role && role !== admin.role) {
      return res.status(403).json({ message: 'Vous ne pouvez pas modifier votre propre rôle' })
    }

    if (isSelf && active === false) {
      return res.status(403).json({ message: 'Vous ne pouvez pas désactiver votre propre compte' })
    }

    // ✅ Validation
    const validation = validateAdminData({ nom, prenom, email, role, password: newPassword }, true)
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Données invalides',
        errors: validation.errors
      })
    }

    // 🔍 Vérifier unicité email
    if (email && email.toLowerCase() !== admin.email) {
      const existingAdmin = await Admin.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: id }
      })
      
      if (existingAdmin) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' })
      }
    }

    // Mise à jour des champs
    if (nom !== undefined) admin.nom = nom.trim()
    if (prenom !== undefined) admin.prenom = prenom.trim()
    if (email !== undefined) admin.email = email.toLowerCase().trim()
    if (role !== undefined) {
      admin.role = role
      // Les permissions seront mises à jour automatiquement par le hook pre-save
    }
    if (active !== undefined) admin.active = active
    if (avatar !== undefined) admin.avatar = avatar

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' })
      }
      admin.password = newPassword
    }

    await admin.save()

    const adminResponse = admin.toObject()
    delete adminResponse.password

    return res.status(200).json({
      message: 'Administrateur mis à jour avec succès',
      data: adminResponse
    })
  } catch (error) {
    console.error('Update admin error:', error)
    return res.status(500).json({ 
      message: 'Erreur lors de la mise à jour',
      error: error.message 
    })
  }
}

// 🗑️ DELETE - Suppression
async function deleteAdmin(req, res, id, currentAdmin) {
  try {
    // 🔒 Empêcher l'auto-suppression
    if (id === currentAdmin._id.toString()) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez pas supprimer votre propre compte' 
      })
    }

    // 🔒 Empêcher la suppression du dernier super_admin
    const adminToDelete = await Admin.findById(id)
    if (!adminToDelete) {
      return res.status(404).json({ message: 'Administrateur non trouvé' })
    }

    if (adminToDelete.role === 'super_admin') {
      const superAdminCount = await Admin.countDocuments({ role: 'super_admin', active: true })
      if (superAdminCount <= 1) {
        return res.status(403).json({ 
          message: 'Impossible de supprimer le dernier super_admin actif' 
        })
      }
    }

    await Admin.findByIdAndDelete(id)

    return res.status(200).json({
      message: 'Administrateur supprimé avec succès',
      data: { id: adminToDelete._id }
    })
  } catch (error) {
    console.error('Delete admin error:', error)
    return res.status(500).json({ 
      message: 'Erreur lors de la suppression',
      error: error.message 
    })
  }
}