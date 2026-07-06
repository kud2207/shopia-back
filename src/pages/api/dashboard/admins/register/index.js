/**
 * @swagger
 * /api/dashboard/admins/register:
 *   get:
 *     summary: Liste des administrateurs
 *     description: Récupère la liste paginée des administrateurs avec filtres optionnels
 *     tags:
 *       - Admin Authentication
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *         example: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page
 *         example: 20
 *
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom, prénom ou email
 *         example: ultiche
 *
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum:
 *             - super_admin
 *             - admin_support
 *             - admin_financier
 *             - admin_commercial
 *         description: Filtrer par rôle
 *         example: super_admin
 *
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut actif
 *         example: true
 *
 *     responses:
 *       200:
 *         description: Liste des administrateurs récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Liste des administrateurs récupérée avec succès
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     admins:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 64fd1234567890abcdef12345
 *
 *                           nom:
 *                             type: string
 *                             example: Kageu
 *
 *                           prenom:
 *                             type: string
 *                             example: Ultiche
 *
 *                           email:
 *                             type: string
 *                             example: ultiche@shopia.com
 *
 *                           role:
 *                             type: string
 *                             example: super_admin
 *
 *                           active:
 *                             type: boolean
 *                             example: true
 *
 *                           avatar:
 *                             type: string
 *                             example: /images/avatars/admin.png
 *
 *                           authProvider:
 *                             type: string
 *                             example: local
 *
 *                           permissions:
 *                             type: object
 *                             properties:
 *                               dashboard:
 *                                 type: boolean
 *                                 example: true
 *                               boutiques:
 *                                 type: boolean
 *                                 example: true
 *                               finances:
 *                                 type: boolean
 *                                 example: true
 *                               utilisateurs:
 *                                 type: boolean
 *                                 example: true
 *                               tickets:
 *                                 type: boolean
 *                                 example: true
 *                               rapports:
 *                                 type: boolean
 *                                 example: true
 *
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 5
 *
 *                         page:
 *                           type: integer
 *                           example: 1
 *
 *                         limit:
 *                           type: integer
 *                           example: 20
 *
 *                         pages:
 *                           type: integer
 *                           example: 1
 *
 *       401:
 *         description: Token d'authentification requis ou invalide
 *
 *       403:
 *         description: Permissions insuffisantes (rôle super_admin requis)
 *
 *       405:
 *         description: Méthode non autorisée
 *
 *       500:
 *         description: Erreur serveur
 *
 *   post:
 *     summary: Créer un administrateur
 *     description: |
 *       Crée un nouvel administrateur.
 *       
 *       - **Premier admin** : Pas de token requis, rôle forcé à super_admin, token retourné automatiquement
 *       - **Admins suivants** : Token super_admin requis
 *     tags:
 *       - Admin Authentication
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
 *               - nom
 *               - prenom
 *               - email
 *               - role
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
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: Requis uniquement si authProvider = local
 *                 example: Azerty123
 *
 *               role:
 *                 type: string
 *                 enum:
 *                   - super_admin
 *                   - admin_support
 *                   - admin_financier
 *                   - admin_commercial
 *                 example: admin_support
 *
 *               authProvider:
 *                 type: string
 *                 enum:
 *                   - local
 *                   - google
 *                 default: local
 *                 example: local
 *
 *               googleId:
 *                 type: string
 *                 description: Requis uniquement si authProvider = google
 *                 example: 109238471923847
 *
 *               avatar:
 *                 type: string
 *                 description: URL de l'avatar (optionnel)
 *                 example: /images/avatars/custom.png
 *
 *     responses:
 *       201:
 *         description: Administrateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Premier administrateur (avec token)
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: ✅ Premier administrateur créé avec succès
 *
 *                     data:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 64fd1234567890abcdef12345
 *
 *                         nom:
 *                           type: string
 *                           example: Kageu
 *
 *                         prenom:
 *                           type: string
 *                           example: Ultiche
 *
 *                         email:
 *                           type: string
 *                           example: ultiche@shopia.com
 *
 *                         role:
 *                           type: string
 *                           example: super_admin
 *
 *                         active:
 *                           type: boolean
 *                           example: true
 *
 *                         authProvider:
 *                           type: string
 *                           example: local
 *
 *                         permissions:
 *                           type: object
 *                           properties:
 *                             dashboard:
 *                               type: boolean
 *                               example: true
 *                             boutiques:
 *                               type: boolean
 *                               example: true
 *                             finances:
 *                               type: boolean
 *                               example: true
 *                             utilisateurs:
 *                               type: boolean
 *                               example: true
 *                             tickets:
 *                               type: boolean
 *                               example: true
 *                             rapports:
 *                               type: boolean
 *                               example: true
 *
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 *                     isFirstAdmin:
 *                       type: boolean
 *                       example: true
 *
 *                 - type: object
 *                   description: Admins suivants (sans token)
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Administrateur créé avec succès
 *
 *                     data:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 64fd1234567890abcdef12345
 *
 *                         nom:
 *                           type: string
 *                           example: Support
 *
 *                         prenom:
 *                           type: string
 *                           example: Alice
 *
 *                         email:
 *                           type: string
 *                           example: alice@shopia.com
 *
 *                         role:
 *                           type: string
 *                           example: admin_support
 *
 *                         active:
 *                           type: boolean
 *                           example: true
 *
 *                         authProvider:
 *                           type: string
 *                           example: local
 *
 *                         permissions:
 *                           type: object
 *                           properties:
 *                             dashboard:
 *                               type: boolean
 *                               example: true
 *                             boutiques:
 *                               type: boolean
 *                               example: true
 *                             finances:
 *                               type: boolean
 *                               example: false
 *                             utilisateurs:
 *                               type: boolean
 *                               example: false
 *                             tickets:
 *                               type: boolean
 *                               example: true
 *                             rapports:
 *                               type: boolean
 *                               example: true
 *
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               description: Cookie défini uniquement pour le premier admin
 *               example: adminToken=eyJhbGciOi...; Path=/; HttpOnly; SameSite=Strict; Max-Age=315360000
 *
 *       400:
 *         description: Données invalides ou email déjà utilisé
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
 *                         - Le nom doit contenir au moins 2 caractères
 *                         - Email invalide
 *
 *                 - type: object
 *                   description: Email déjà utilisé
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Un administrateur avec cet email existe déjà
 *
 *       401:
 *         description: Token d'authentification requis (pour admins suivants)
 *
 *       403:
 *         description: Permissions insuffisantes (rôle super_admin requis)
 *
 *       405:
 *         description: Méthode non autorisée
 *
 *       500:
 *         description: Erreur serveur
 */


import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { validateAdminData } from 'src/@apiCore/middlewares/validateAdmin'
import { signToken } from 'src/@apiCore/lib/jwt'
import Admin from 'src/@apiCore/models/admin'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })

  try {
    // 🛡️ Auth : super_admin requis (sauf premier admin)
    const auth = await withAuth({ 
      roles: ['super_admin'],
      allowFirstAdmin: true
    })(req, res)

    if (auth.error) return auth.error

    const { isFirstAdmin } = auth

    switch (req.method) {
      case 'GET':
        return await getAdmins(req, res)
      case 'POST':
        return await createAdmin(req, res, isFirstAdmin)
      default:
        return res.status(405).json({ message: 'Méthode non autorisée' })
    }
  } catch (error) {
    console.error('Admins API error:', error)
    return res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    })
  }
}

// 📋 GET - Liste des admins
async function getAdmins(req, res) {
  try {
    const { page = 1, limit = 20, search, role, active } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const filters = {}
    
    if (search) {
      filters.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (role) filters.role = role
    if (active !== undefined) filters.active = active === 'true'

    const [admins, total] = await Promise.all([
      Admin.find(filters)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Admin.countDocuments(filters)
    ])

    return res.status(200).json({
      message: 'Liste des administrateurs récupérée avec succès',
      data: {
        admins,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    console.error('Get admins error:', error)
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération',
      error: error.message 
    })
  }
}

// ➕ POST - Création d'un admin
async function createAdmin(req, res, isFirstAdmin) {
  try {
    const { 
      nom, 
      prenom, 
      email, 
      password, 
      role, 
      authProvider = 'local',
      googleId,
      avatar 
    } = req.body

    // ✅ Validation
    const validation = validateAdminData({ nom, prenom, email, password, role, authProvider })
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: 'Données invalides',
        errors: validation.errors
      })
    }

    // 🔍 Vérifier email unique
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() })
    if (existingAdmin) {
      return res.status(400).json({ 
        message: 'Un administrateur avec cet email existe déjà' 
      })
    }

    // 🎯 Premier admin = super_admin forcé
    const finalRole = isFirstAdmin ? 'super_admin' : role

    const adminData = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.toLowerCase().trim(),
      role: finalRole,
      authProvider,
      avatar: avatar || null
    }

    if (authProvider === 'google') {
      adminData.googleId = googleId || null
      adminData.password = null
    } else {
      adminData.password = password
    }

    const newAdmin = await Admin.create(adminData)
    const adminResponse = newAdmin.toObject()
    delete adminResponse.password

    // 🎁 Premier admin → token automatique
    if (isFirstAdmin) {
      const token = signToken({ 
        adminId: newAdmin._id, 
        role: newAdmin.role,
        email: newAdmin.email
      })

      // 🍪 Set cookie
      res.setHeader('Set-Cookie', [
        `adminToken=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${3650 * 24 * 60 * 60}`
      ])

      return res.status(201).json({
        message: '✅ Premier administrateur créé avec succès',
        data: adminResponse,
        token,
        isFirstAdmin: true
      })
    }

    return res.status(201).json({
      message: 'Administrateur créé avec succès',
      data: adminResponse
    })
  } catch (error) {
    console.error('Create admin error:', error)
    return res.status(500).json({ 
      message: 'Erreur lors de la création',
      error: error.message 
    })
  }
}