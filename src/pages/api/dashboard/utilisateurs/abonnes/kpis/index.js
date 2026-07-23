/**
 * @swagger
 * /api/dashboard/utilisateurs/abonnes/kpis:
 *   get:
 *     summary: KPIs des utilisateurs abonnés
 *     description: |
 *       Retourne les indicateurs clés du module Utilisateurs.
 *       
 *       **Métriques** :
 *       - Abonnés actifs
 *       - Nouvelles inscriptions
 *       - Abonnements expirés
 *       - Comptes suspendus
 *       - E-commerçants
 *       - Livreurs & Prestataires
 *     tags:
 *       - Utilisateurs - Abonnés
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
 *                 abonnes_actifs:
 *                   type: integer
 *                   example: 142
 *                 abonnes_actifs_tendance:
 *                   type: number
 *                   example: 20
 *                 nouvelles_inscriptions:
 *                   type: integer
 *                   example: 8
 *                 nouvelles_inscriptions_tendance:
 *                   type: number
 *                   example: 5
 *                 abonnements_expires:
 *                   type: integer
 *                   example: 10
 *                 abonnements_expires_tendance:
 *                   type: number
 *                   example: 3
 *                 comptes_suspendus:
 *                   type: integer
 *                   example: 5
 *                 comptes_suspendus_tendance:
 *                   type: number
 *                   example: 1
 *                 e_commercants:
 *                   type: integer
 *                   example: 10
 *                 e_commercants_tendance:
 *                   type: number
 *                   example: 5
 *                 livreurs_prestataires:
 *                   type: integer
 *                   example: 30
 *                 livreurs_prestataires_tendance:
 *                   type: number
 *                   example: 8
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // 📊 Calculer tous les KPIs en parallèle
    const [
      currentActive,
      previousActive,
      currentNewRegistrations,
      previousNewRegistrations,
      currentExpired,
      previousExpired,
      currentSuspended,
      previousSuspended,
      currentEcommercants,
      previousEcommercants,
      currentDeliveryProviders,
      previousDeliveryProviders
    ] = await Promise.all([
      // Abonnés actifs (actifs et non expirés)
      Shop.countDocuments({
        active: true,
        plan: { $exists: true },
        expire_date: { $gte: now }
      }),
      Shop.countDocuments({
        active: true,
        plan: { $exists: true },
        expire_date: { $gte: previousMonthStart, $lt: now }
      }),

      // Nouvelles inscriptions (ce mois-ci)
      Shop.countDocuments({
        createdAt: { $gte: currentMonthStart }
      }),
      Shop.countDocuments({
        createdAt: { $gte: previousMonthStart, $lt: currentMonthStart }
      }),

      // Abonnements expirés
      Shop.countDocuments({
        plan: { $exists: true },
        expire_date: { $lt: now }
      }),
      Shop.countDocuments({
        plan: { $exists: true },
        expire_date: { $lt: previousMonthStart }
      }),

      // Comptes suspendus (désactivés)
      Shop.countDocuments({
        active: false
      }),
      Shop.countDocuments({
        active: false,
        updatedAt: { $gte: previousMonthStart }
      }),

      // E-commerçants (type: product/marchand/ecommerce)
      Shop.countDocuments({
        type: { $in: ['product', 'marchand', 'ecommerce'] },
        active: true
      }),
      Shop.countDocuments({
        type: { $in: ['product', 'marchand', 'ecommerce'] },
        createdAt: { $gte: previousMonthStart }
      }),

      // Livreurs & Prestataires (type: delivery/livraison/service/prestataire)
      Shop.countDocuments({
        type: { $in: ['delivery', 'livraison', 'service', 'prestataire'] },
        active: true
      }),
      Shop.countDocuments({
        type: { $in: ['delivery', 'livraison', 'service', 'prestataire'] },
        createdAt: { $gte: previousMonthStart }
      })
    ])

    // Calculer les tendances
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0
      return Number((((current - previous) / previous) * 100).toFixed(1))
    }

    return res.status(200).json({
      success: true,
      message: 'KPIs utilisateurs récupérés avec succès',
      data: {
        abonnes_actifs: currentActive,
        abonnes_actifs_tendance: calculateTrend(currentActive, previousActive),
        nouvelles_inscriptions: currentNewRegistrations,
        nouvelles_inscriptions_tendance: calculateTrend(currentNewRegistrations, previousNewRegistrations),
        abonnements_expires: currentExpired,
        abonnements_expires_tendance: calculateTrend(currentExpired, previousExpired),
        comptes_suspendus: currentSuspended,
        comptes_suspendus_tendance: calculateTrend(currentSuspended, previousSuspended),
        e_commercants: currentEcommercants,
        e_commercants_tendance: calculateTrend(currentEcommercants, previousEcommercants),
        livreurs_prestataires: currentDeliveryProviders,
        livreurs_prestataires_tendance: calculateTrend(currentDeliveryProviders, previousDeliveryProviders)
      }
    })

  } catch (error) {
    console.error('❌ Utilisateurs KPIs API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}