
/**
 * @swagger
 * /api/dashboard/stats-dashboard/charts/profils:
 *   get:
 *     summary: Répartition des profils utilisateurs
 *     description: |
 *       Retourne la répartition en pourcentage des utilisateurs actifs par type de profil.
 *       
 *       **Profils comptabilisés** :
 *       - 🏪 Marchands (rôle "marchand")
 *       - 🚚 Livraison (rôle "livraison")
 *       - 🛠️ Prestataires (rôle "prestataire")
 *       
 *       **Note** : La somme des 3 pourcentages est égale à 100%.
 *       Seuls les utilisateurs actifs sont pris en compte.
 *     tags:
 *       - stats-dashboard
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Répartition récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Succès
 *
 *                 data:
 *                   type: object
 *                   description: Répartition en pourcentage par type de profil
 *                   properties:
 *                     marchands:
 *                       type: number
 *                       format: float
 *                       description: Pourcentage d'utilisateurs avec le rôle "marchand"
 *                       example: 62.5
 *
 *                     livraison:
 *                       type: number
 *                       format: float
 *                       description: Pourcentage d'utilisateurs avec le rôle "livraison"
 *                       example: 23.3
 *
 *                     prestataires:
 *                       type: number
 *                       format: float
 *                       description: Pourcentage d'utilisateurs avec le rôle "prestataire"
 *                       example: 14.2
 *
 *                   example:
 *                     marchands: 62.5
 *                     livraison: 23.3
 *                     prestataires: 14.2
 *
 *       401:
 *         description: Token d'authentification requis ou invalide
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
 *                   example: Permissions insuffisantes
 *
 *       405:
 *         description: Méthode non autorisée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Méthode non autorisée
 *
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Erreur serveur
 *                 error:
 *                   type: string
 *                   example: Détails de l'erreur
 */

import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import User from 'src/@apiCore/models/user'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] })(req, res)
    if (auth.error) return auth.error

    const data = await User.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ])

    const total = data.reduce((s, i) => s + i.count, 0) || 1
    const getPercent = (role) => parseFloat(((data.find(r => r._id === role)?.count || 0) / total * 100).toFixed(1))

    return res.status(200).json({ 
      message: 'Succès', 
      data: {
        marchands: getPercent('marchand'),
        livraison: getPercent('livraison'),
        prestataires: getPercent('prestataire')
      } 
    })
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message })
  }
}
