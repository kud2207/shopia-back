/**
 * @swagger
 * /api/dashboard/utilisateurs/roles-admin/{id}:
 *   get:
 *     summary: Détails d'un administrateur
 *     description: Retourne les détails complets de l'admin + historique des connexions
 *     tags:
 *       - Utilisateurs - Rôles admin
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'administrateur
 *
 *     responses:
 *       200:
 *         description: Détails récupérés avec succès
 *
 *   put:
 *     summary: Modifier un administrateur
 *     description: |
 *       Met à jour les informations d'un administrateur.
 *       
 *       **Règles métier** :
 *       - Logger toutes les modifications dans audit_log
 *       - Notification à l'admin concerné si changement de rôle/permissions
 *     tags:
 *       - Utilisateurs - Rôles admin
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
 *               role:
 *                 type: string
 *                 enum: [super_admin, admin_support, admin_financier, admin_commercial]
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *
 *     responses:
 *       200:
 *         description: Administrateur mis à jour avec succès
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
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
      return res.status(400).json({
        success: false,
        message: 'ID invalide'
      })
    }

    if (req.method === 'GET') {
      return await getAdminDetails(req, res, id)
    } else if (req.method === 'PUT') {
      return await updateAdmin(req, res, id, auth.admin)
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Admin Details/Update API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// GET - Détails d'un admin
async function getAdminDetails(req, res, id) {
  const admin = await Admin.findById(id).select('-password')
  
  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Administrateur non trouvé'
    })
  }

  return res.status(200).json({
    success: true,
    data: {
      id: admin._id,
      nom_complet: `${admin.prenom} ${admin.nom}`,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || [],
      statut: admin.active ? 'actif' : 'désactivé',
      date_creation: admin.createdAt?.toISOString().split('T')[0] || '-',
      derniere_connexion: admin.lastLogin ? getTimeAgo(admin.lastLogin) : 'Jamais',
      historique_connexions: admin.loginHistory?.slice(0, 10) || []
    }
  })
}

// PUT - Modifier un admin
async function updateAdmin(req, res, id, currentAdmin) {
  const { 
    nom_complet,
    email,
    role,
    permissions 
  } = req.body

  const admin = await Admin.findById(id)
  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Administrateur non trouvé'
    })
  }

  // Enregistrer les modifications
  const changes = []

  if (nom_complet && nom_complet !== `${admin.prenom} ${admin.nom}`) {
    const nameParts = nom_complet.trim().split(' ')
    admin.prenom = nameParts[0] || admin.prenom
    admin.nom = nameParts.slice(1).join(' ') || admin.nom
    changes.push(`Nom modifié`)
  }

  if (email && email !== admin.email) {
    const existingEmail = await Admin.findOne({ email: email.toLowerCase(), _id: { $ne: id } })
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      })
    }
    admin.email = email.toLowerCase()
    changes.push(`Email modifié de "${admin.email}" à "${email}"`)
  }

  if (role && role !== admin.role) {
    // Seul un Super Admin peut changer le rôle
    if (currentAdmin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Seul un Super Admin peut modifier le rôle d\'un administrateur'
      })
    }
    admin.role = role
    changes.push(`Rôle modifié de "${admin.role}" à "${role}"`)
  }

  if (permissions) {
    admin.permissions = permissions
    changes.push('Permissions modifiées')
  }

  await admin.save()

  // Logger dans l'audit log
  if (changes.length > 0) {
    const audit = new AuditLog({
      userId: currentAdmin._id,
      action: 'UPDATE_ADMIN',
      targetId: admin._id,
      details: changes.join('; '),
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    })
    await audit.save()
  }

  // TODO: Envoyer notification à l'admin concerné

  return res.status(200).json({
    success: true,
    message: 'Administrateur mis à jour avec succès',
    data: {
      id: admin._id,
      nom_complet: `${admin.prenom} ${admin.nom}`,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions
    }
  })
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
  return 'À l\'instant'
}