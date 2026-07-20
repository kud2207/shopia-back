/**
 * @swagger
 * /api/dashboard/utilisateurs/roles-admin:
 *   get:
 *     summary: Liste des administrateurs
 *     description: |
 *       Retourne la liste paginée des administrateurs avec filtres.
 *       
 *       **Filtres disponibles** :
 *       - `search` : Recherche par nom ou email
 *       - `role` : super_admin, admin_support, admin_financier, admin_commercial
 *       - `statut` : actif, desactive
 *     tags:
 *       - Utilisateurs - Rôles admin
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom ou email
 *
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [super_admin, admin_support, admin_financier, admin_commercial]
 *
 *       - in: query
 *         name: statut
 *         schema:
 *           type: string
 *           enum: [actif, desactive]
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
 *         description: Liste récupérée avec succès
 *
 *   post:
 *     summary: Créer un nouvel administrateur
 *     description: |
 *       Crée un administrateur avec email d'invitation.
 *       Seul un Super Admin peut créer d'autres admins.
 *       
 *       **Règles métier** :
 *       - Génère un mot de passe temporaire si non fourni
 *       - Envoie email d'invitation
 *       - Logger dans audit_log
 *     tags:
 *       - Utilisateurs - Rôles admin
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
 *               - nom_complet
 *               - email
 *               - role
 *             properties:
 *               nom_complet:
 *                 type: string
 *                 example: Jean Dupont
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jean@shopia.com
 *               password:
 *                 type: string
 *                 example: MotDePasse123!
 *               role:
 *                 type: string
 *                 enum: [super_admin, admin_support, admin_financier, admin_commercial]
 *                 example: admin_support
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["consultation_boutiques", "gestion_tickets", "messagerie"]
 *
 *     responses:
 *       201:
 *         description: Administrateur créé avec succès
 *
 *       403:
 *         description: Permissions insuffisantes
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import { generatePassword, sendInvitationEmail } from 'src/@apiCore/lib/email'
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

    if (req.method === 'GET') {
      return await getAdmins(req, res)
    } else if (req.method === 'POST') {
      return await createAdmin(req, res, auth.admin)
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Admins API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// GET - Liste des admins
async function getAdmins(req, res) {
  const { 
    search = '', 
    role = '', 
    statut = '',
    page = 1, 
    limit = 20 
  } = req.query

  const baseFilter = {}

  if (search) {
    baseFilter.$or = [
      { nom: { $regex: search, $options: 'i' } },
      { prenom: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  }

  if (role) {
    baseFilter.role = role
  }

  if (statut) {
    baseFilter.active = statut === 'actif'
  }

  const admins = await Admin.find(baseFilter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))

  const total = await Admin.countDocuments(baseFilter)

  const formattedAdmins = admins.map(admin => ({
    id: admin._id,
    nom_complet: `${admin.prenom} ${admin.nom}`,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions || getDefaultPermissions(admin.role),
    statut: admin.active ? 'actif' : 'désactivé',
    date_creation: admin.createdAt?.toISOString().split('T')[0] || '-',
    derniere_connexion: admin.lastLogin ? getTimeAgo(admin.lastLogin) : 'Jamais'
  }))

  return res.status(200).json({
    success: true,
    message: 'Liste des administrateurs récupérée avec succès',
    data: {
      data: formattedAdmins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        total_pages: Math.ceil(total / parseInt(limit))
      }
    }
  })
}

// POST - Créer un admin
async function createAdmin(req, res, currentAdmin) {
  const { 
    nom_complet,
    email,
    password,
    role,
    permissions 
  } = req.body

  // Vérifier que seul un Super Admin peut créer des admins
  if (currentAdmin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Seul un Super Admin peut créer de nouveaux administrateurs'
    })
  }

  // Validation
  if (!nom_complet || !email || !role) {
    return res.status(400).json({
      success: false,
      message: 'Les champs nom_complet, email et role sont obligatoires'
    })
  }

  // Vérifier si l'email existe déjà
  const existingAdmin = await Admin.findOne({ email: email.toLowerCase() })
  if (existingAdmin) {
    return res.status(409).json({
      success: false,
      message: 'Cet email est déjà utilisé par un autre administrateur'
    })
  }

  // Générer un mot de passe temporaire si non fourni
  const tempPassword = password || generatePassword(12)
  const hashedPassword = await Admin.hashPassword(tempPassword)

  // Décomposer le nom complet
  const nameParts = nom_complet.trim().split(' ')
  const prenom = nameParts[0] || ''
  const nom = nameParts.slice(1).join(' ') || prenom

  // Créer l'admin
  const newAdmin = new Admin({
    nom,
    prenom,
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
    permissions: permissions || getDefaultPermissions(role),
    active: true,
    createdBy: currentAdmin._id
  })
  await newAdmin.save()

  // Envoyer l'email d'invitation
  try {
    await sendInvitationEmail({
      email: newAdmin.email,
      name: newAdmin.prenom,
      role: newAdmin.role,
      password: tempPassword,
      invitedBy: currentAdmin.email
    })
  } catch (emailError) {
    console.error('Erreur envoi email:', emailError)
  }

  // Logger dans l'audit log
  const audit = new AuditLog({
    userId: currentAdmin._id,
    action: 'CREATE_ADMIN',
    targetId: newAdmin._id,
    details: `Administrateur créé: ${newAdmin.email} (${newAdmin.role})`,
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
  })
  await audit.save()

  return res.status(201).json({
    success: true,
    message: 'Administrateur créé avec succès',
    data: {
      id: newAdmin._id,
      nom_complet: `${newAdmin.prenom} ${newAdmin.nom}`,
      email: newAdmin.email,
      role: newAdmin.role,
      permissions: newAdmin.permissions
    }
  })
}

// Helper pour les permissions par défaut
function getDefaultPermissions(role) {
  const defaults = {
    'super_admin': ['*'],
    'admin_support': ['consultation_boutiques', 'gestion_tickets', 'messagerie'],
    'admin_financier': ['module_financier', 'rapports', 'abonnements'],
    'admin_commercial': ['suivi_activite', 'relances_abonnes', 'performance']
  }
  return defaults[role] || []
}

// Helper pour afficher "Il y a X temps"
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