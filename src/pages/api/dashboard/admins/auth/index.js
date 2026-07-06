import { verifyAuth, extractToken } from 'src/@apiCore/lib/auth'

/**
 * @swagger
 * /api/dashboard/admins/auth:
 *   get:
 *     summary: Vérifier l'authentification
 *     description: |
 *       Vérifie si le token JWT est valide.
 *       Le frontend appelle cet endpoint pour décider de bloquer ou non une route.
 *     tags:
 *       - Admin Authentication
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *
 *     responses:
 *       200:
 *         description: Token valide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Authentification valide
 *
 *       401:
 *         description: Token invalide ou manquant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Token invalide ou expiré
 */

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ valid: false, message: 'Méthode non autorisée' })
  }

  try {
    // Extraire le token
    const token = extractToken(req.headers)

    if (!token) {
      return res.status(401).json({ 
        valid: false, 
        message: 'Token manquant' 
      })
    }

    // Vérifier le token
    const isValid = verifyAuth(token)

    if (isValid) {
      return res.status(200).json({ 
        valid: true, 
        message: 'Authentification valide' 
      })
    } else {
      return res.status(401).json({ 
        valid: false, 
        message: 'Token invalide ou expiré' 
      })
    }
  } catch (error) {
    return res.status(500).json({ 
      valid: false, 
      message: 'Erreur serveur' 
    })
  }
}