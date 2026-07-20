/**
 * @swagger
 * /api/dashboard/utilisateurs/collaborateurs/kpis:
 *   get:
 *     summary: KPIs des collaborateurs
 *     description: |
 *       Retourne les indicateurs clés des collaborateurs de la plateforme.
 *       
 *       **Métriques** :
 *       - Total collaborateurs
 *       - Collaborateurs actifs
 *       - Collaborateurs désactivés
 *       - Moyenne par boutique
 *     tags:
 *       - Utilisateurs - Collaborateurs
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: KPIs récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_collaborateurs:
 *                   type: integer
 *                   example: 38
 *                 total_collaborateurs_tendance:
 *                   type: number
 *                   example: 20
 *                 collaborateurs_actifs:
 *                   type: integer
 *                   example: 32
 *                 collaborateurs_actifs_tendance:
 *                   type: number
 *                   example: 5
 *                 collaborateurs_desactives:
 *                   type: integer
 *                   example: 10
 *                 collaborateurs_desactives_tendance:
 *                   type: number
 *                   example: 3
 *                 moyenne_par_boutique:
 *                   type: number
 *                   example: 10
 *                 moyenne_par_boutique_tendance:
 *                   type: number
 *                   example: 10
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'
import Shop from 'src/@apiCore/models/shop'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // 📊 Calculer tous les KPIs en parallèle
    const [
      currentTotal,
      previousTotal,
      currentActive,
      previousActive,
      currentDisabled,
      previousDisabled,
      totalShops,
      previousTotalShops
    ] = await Promise.all([
      // Total collaborateurs (rôles: vendeur, gestionnaire, admin_boutique)
      User.countDocuments({
        role: { $in: ['vendeur', 'gestionnaire', 'admin_boutique'] }
      }),
      User.countDocuments({
        role: { $in: ['vendeur', 'gestionnaire', 'admin_boutique'] },
        createdAt: { $gte: previousMonthStart }
      }),

      // Collaborateurs actifs
      User.countDocuments({
        role: { $in: ['vendeur', 'gestionnaire', 'admin_boutique'] },
        active: true
      }),
      User.countDocuments({
        role: { $in: ['vendeur', 'gestionnaire', 'admin_boutique'] },
        active: true,
        createdAt: { $gte: previousMonthStart }
      }),

      // Collaborateurs désactivés
      User.countDocuments({
        role: { $in: ['vendeur', 'gestionnaire', 'admin_boutique'] },
        active: false
      }),
      User.countDocuments({
        role: { $in: ['vendeur', 'gestionnaire', 'admin_boutique'] },
        active: false,
        updatedAt: { $gte: previousMonthStart }
      }),

      // Total des boutiques
      Shop.countDocuments({ active: true }),
      Shop.countDocuments({ createdAt: { $gte: previousMonthStart } })
    ])

    // Calculer la moyenne par boutique
    const moyenneParBoutique = totalShops > 0 
      ? parseFloat((currentTotal / totalShops).toFixed(1))
      : 0

    const previousMoyenne = previousTotalShops > 0
      ? parseFloat((previousTotal / previousTotalShops).toFixed(1))
      : 0

    // Calculer les tendances
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0
      return Number((((current - previous) / previous) * 100).toFixed(1))
    }

    return res.status(200).json({
      success: true,
      message: 'KPIs collaborateurs récupérés avec succès',
      data: {
        total_collaborateurs: currentTotal,
        total_collaborateurs_tendance: calculateTrend(currentTotal, previousTotal),
        collaborateurs_actifs: currentActive,
        collaborateurs_actifs_tendance: calculateTrend(currentActive, previousActive),
        collaborateurs_desactives: currentDisabled,
        collaborateurs_desactives_tendance: calculateTrend(currentDisabled, previousDisabled),
        moyenne_par_boutique: moyenneParBoutique,
        moyenne_par_boutique_tendance: calculateTrend(moyenneParBoutique, previousMoyenne)
      }
    })

  } catch (error) {
    console.error('❌ Collaborateurs KPIs API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}