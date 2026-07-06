
import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import { signToken } from 'src/@apiCore/lib/jwt'


/**
 * @swagger
 * /api/dashboard/admins/login:
 *   post:
 *     summary: Connexion administrateur
 *     description: Authentification admin par email/mot de passe ou Google
 *     tags:
 *       - Admin Authentication
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@shopia.com
 *
 *               password:
 *                 type: string
 *                 example: password123
 *
 *               googleId:
 *                 type: string
 *                 example: 109238471923847
 *
 *               authProvider:
 *                 type: string
 *                 enum:
 *                   - local
 *                   - google
 *                 example: local
 *
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Connecté avec succès
 *
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1Ni...
 *
 *                 authProvider:
 *                   type: string
 *                   example: local
 *
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64fd123456789
 *
 *                     email:
 *                       type: string
 *                       example: admin@shopia.com
 *
 *                     role:
 *                       type: string
 *                       example: admin
 *
 *       400:
 *         description: Données invalides
 *
 *       401:
 *         description: Identifiants incorrects ou compte Google introuvable
 *
 *       403:
 *         description: Compte désactivé
 *
 *       405:
 *         description: Méthode non autorisée
 *
 *       500:
 *         description: Erreur serveur
 */



export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    await dbConnect()

    const { email, password, googleId, authProvider = 'local' } = req.body

    if (authProvider === 'google') {
      return await loginWithGoogle(req, res, { googleId })
    }

    return await loginLocal(req, res, { email, password })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ 
      message: 'Erreur lors de la connexion',
      error: error.message 
    })
  }
}

async function loginWithGoogle(req, res, { googleId }) {
  if (!googleId) {
    return res.status(400).json({ message: 'Google ID requis' })
  }

  const admin = await Admin.findOne({ googleId })
  if (!admin) {
    return res.status(401).json({ message: 'Aucun compte admin trouvé avec ce compte Google' })
  }
  if (!admin.active) {
    return res.status(403).json({ message: 'Compte administrateur désactivé' })
  }

  admin.lastLogin = new Date()
  await admin.save()

  const token = signToken({
    adminId: admin._id,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions
  })

  const adminResponse = admin.toObject()
  delete adminResponse.password

  res.setHeader('Set-Cookie', [
    `adminToken=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${3650 * 24 * 60 * 60}`
  ])

  return res.status(200).json({
    message: 'Connecté avec succès via Google',
    token,
    user: adminResponse,
    authProvider: 'google'
  })
}

async function loginLocal(req, res, { email, password }) {
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' })
  }

  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password')
  if (!admin) {
    return res.status(401).json({ message: 'Identifiants incorrects' })
  }

  if (admin.authProvider === 'google') {
    return res.status(400).json({ message: 'Ce compte utilise Google. Veuillez vous connecter avec Google.' })
  }

  const isPasswordValid = await admin.comparePassword(password)
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Identifiants incorrects' })
  }

  if (!admin.active) {
    return res.status(403).json({ message: 'Compte administrateur désactivé' })
  }

  admin.lastLogin = new Date()
  await admin.save()

  const token = signToken({
    adminId: admin._id,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions
  })

  const adminResponse = admin.toObject()
  delete adminResponse.password

  res.setHeader('Set-Cookie', [
    `adminToken=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${3650 * 24 * 60 * 60}`
  ])

  return res.status(200).json({
    message: 'Connecté avec succès',
    token,
    user: adminResponse,
    authProvider: 'local'
  })
}