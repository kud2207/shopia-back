/**
 * @swagger
 * /api/dashboard/profil/moi:
 *   get:
 *     summary: Récupérer mon profil
 *     description: |
 *       Retourne les informations complètes de l'administrateur connecté.
 *       
 *       **Données incluses** :
 *       - Informations personnelles
 *       - Préférences d'affichage
 *       - Paramètres de sécurité
 *     tags:
 *       - Profil Admin
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Profil récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 nom_complet:
 *                   type: string
 *                 email:
 *                   type: string
 *                 telephone:
 *                   type: string
 *                 role:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                 pays:
 *                   type: string
 *                 ville:
 *                   type: string
 *                 date_creation:
 *                   type: string
 *                   format: date
 *                 derniere_connexion:
 *                   type: string
 *                   format: date-time
 *                 preferences:
 *                   type: object
 *                 securite:
 *                   type: object
 *
 *   put:
 *     summary: Modifier mon profil
 *     description: |
 *       Met à jour les informations personnelles de l'admin connecté.
 *       
 *       **Règles métier** :
 *       - Vérifie l'unicité de l'email
 *       - Envoie email de confirmation si email changé
 *       - Logger dans audit_log
 *     tags:
 *       - Profil Admin
 *     security:
 *       - bearerAuth: []
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
 *                 example: Jean Dupont
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jean.dupont@shopia.com
 *               telephone:
 *                 type: string
 *                 example: "+237 6 97 35 07 56"
 *               pays:
 *                 type: string
 *                 example: Cameroun
 *               ville:
 *                 type: string
 *                 example: Yaoundé
 *
 *     responses:
 *       200:
 *         description: Profil mis à jour avec succès
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import AuditLog from 'src/@apiCore/models/auditLog'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    if (req.method === 'GET') {
      return await getMyProfile(req, res, auth.admin)
    } else if (req.method === 'PUT') {
      return await updateMyProfile(req, res, auth.admin)
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Profil API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}

// GET - Récupérer mon profil
async function getMyProfile(req, res, admin) {
  const adminData = await Admin.findById(admin._id).select('-password')

  return res.status(200).json({
    success: true,
    message: 'Profil récupéré avec succès',
    data: {
      id: adminData._id,
      nom_complet: `${adminData.prenom} ${adminData.nom}`,
      email: adminData.email,
      telephone: adminData.phone || '',
      role: adminData.role,
      avatar_url: adminData.avatar || '/images/avatars/admin.png',
      pays: adminData.country || 'Cameroun',
      ville: adminData.city || 'Yaoundé',
      date_creation: adminData.createdAt?.toISOString().split('T')[0] || '-',
      derniere_connexion: adminData.lastLogin?.toISOString() || null,
      preferences: {
        langue: adminData.preferences?.langue || 'fr',
        format_date: adminData.preferences?.format_date || 'JJ/MM/AA',
        format_heure: adminData.preferences?.format_heure || '24h',
        fuseau_horaire: adminData.preferences?.fuseau_horaire || 'Afrique/Yaounde',
        notifications_email: adminData.preferences?.notifications_email ?? true,
        notifications_push: adminData.preferences?.notifications_push ?? true
      },
      securite: {
        "2fa_active": adminData.twoFactorEnabled || false,
        "2fa_method": adminData.twoFactorMethod || 'email',
        dernier_changement_mdp: adminData.passwordChangedAt?.toISOString().split('T')[0] || '-'
      }
    }
  })
}

// PUT - Modifier mon profil
async function updateMyProfile(req, res, admin) {
  const { nom_complet, email, telephone, pays, ville } = req.body

  const adminToUpdate = await Admin.findById(admin._id)
  const changes = []

  // Traiter le nom complet
  if (nom_complet) {
    const nameParts = nom_complet.trim().split(' ')
    const newPrenom = nameParts[0] || adminToUpdate.prenom
    const newNom = nameParts.slice(1).join(' ') || adminToUpdate.nom
    
    if (newPrenom !== adminToUpdate.prenom || newNom !== adminToUpdate.nom) {
      changes.push(`Nom modifié de "${adminToUpdate.prenom} ${adminToUpdate.nom}" à "${nom_complet}"`)
      adminToUpdate.prenom = newPrenom
      adminToUpdate.nom = newNom
    }
  }

  // Traiter l'email
  if (email && email !== adminToUpdate.email) {
    const existingEmail = await Admin.findOne({ email: email.toLowerCase(), _id: { $ne: admin._id } })
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé par un autre administrateur'
      })
    }
    changes.push(`Email modifié de "${adminToUpdate.email}" à "${email}"`)
    adminToUpdate.email = email.toLowerCase()
    
    // TODO: Envoyer email de confirmation
  }

  // Traiter le téléphone
  if (telephone && telephone !== adminToUpdate.phone) {
    changes.push(`Téléphone modifié de "${adminToUpdate.phone}" à "${telephone}"`)
    adminToUpdate.phone = telephone
  }

  // Traiter pays et ville
  if (pays && pays !== adminToUpdate.country) {
    changes.push(`Pays modifié à "${pays}"`)
    adminToUpdate.country = pays
  }
  
  if (ville && ville !== adminToUpdate.city) {
    changes.push(`Ville modifiée à "${ville}"`)
    adminToUpdate.city = ville
  }

  await adminToUpdate.save()

  // Logger dans l'audit log
  if (changes.length > 0) {
    await new AuditLog({
      userId: admin._id,
      action: 'MODIFY_PROFILE',
      targetId: admin._id,
      targetModel: 'Admin',
      details: { changes: changes.join('; ') },
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }).save()
  }

  return res.status(200).json({
    success: true,
    message: 'Profil mis à jour avec succès',
    data: {
      id: adminToUpdate._id,
      nom_complet: `${adminToUpdate.prenom} ${adminToUpdate.nom}`,
      email: adminToUpdate.email,
      telephone: adminToUpdate.phone,
      pays: adminToUpdate.country,
      ville: adminToUpdate.city
    }
  })
}