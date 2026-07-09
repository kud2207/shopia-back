/**
 * @swagger
 * /api/dashboard/boutiques/stats:
 *   get:
 *     summary: Statistiques globales des boutiques
 *     description: |
 *       Retourne les 4 KPIs principaux du module Boutiques avec leurs tendances mensuelles.
 *       
 *       **KPIs retournés** :
 *       - Total des boutiques (tous types confondus)
 *       - E-commerçants (type: "product", "marchand", "ecommerce")
 *       - Services de livraison (type: "delivery", "livraison")
 *       - Prestataires (type: "service", "prestataire")
 *       
 *       **Période de calcul** : Mois en cours vs Mois précédent
 *     tags:
 *       - Boutiques
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *
 *                 message:
 *                   type: string
 *                   example: Statistiques récupérées avec succès
 *
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_boutiques:
 *                       type: integer
 *                       description: Nombre total de boutiques actives
 *                       example: 10
 *
 *                     total_boutiques_tendance:
 *                       type: number
 *                       description: Pourcentage d'évolution vs mois précédent
 *                       example: 5
 *
 *                     e_commercants:
 *                       type: integer
 *                       description: Nombre de boutiques e-commerce
 *                       example: 100
 *
 *                     e_commercants_tendance:
 *                       type: number
 *                       description: Pourcentage d'évolution vs mois précédent
 *                       example: 20
 *
 *                     services_livraison:
 *                       type: integer
 *                       description: Nombre de services de livraison
 *                       example: 10
 *
 *                     services_livraison_tendance:
 *                       type: number
 *                       description: Pourcentage d'évolution vs mois précédent
 *                       example: 3
 *
 *                     prestataires:
 *                       type: integer
 *                       description: Nombre de prestataires de services
 *                       example: 50
 *
 *                     prestataires_tendance:
 *                       type: number
 *                       description: Pourcentage d'évolution vs mois précédent
 *                       example: -10
 *
 *       401:
 *         description: Token d'authentification requis ou invalide
 *
 *       403:
 *         description: Permissions insuffisantes
 *
 *       500:
 *         description: Erreur serveur
 */

//figma-1


import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

/**
 * 📊 Calcule la tendance en pourcentage
 * @param {number} current - Valeur actuelle
 * @param {number} previous - Valeur précédente
 * @returns {number} Pourcentage de tendance
 */
const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    // 🔐 Authentification requise
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

    // 🚀 Requêtes en parallèle pour les 4 catégories
    const [
      // Total boutiques
      currentTotal,
      previousTotal,
      
      // E-commerçants
      currentEcommercants,
      previousEcommercants,
      
      // Services livraison
      currentDelivery,
      previousDelivery,
      
      // Prestataires
      currentPrestataires,
      previousPrestataires
    ] = await Promise.all([
      // Total actuel
      Shop.countDocuments({ 
        active: true, 
        isDelete: false,
        createdAt: { $lt: today }
      }),
      // Total mois précédent
      Shop.countDocuments({ 
        active: true, 
        isDelete: false,
        createdAt: { $lt: lastMonth }
      }),
      
      // E-commerçants actuels
      Shop.countDocuments({
        active: true,
        isDelete: false,
        type: { $in: ['product', 'marchand', 'ecommerce'] },
        createdAt: { $lt: today }
      }),
      // E-commerçants mois précédent
      Shop.countDocuments({
        active: true,
        isDelete: false,
        type: { $in: ['product', 'marchand', 'ecommerce'] },
        createdAt: { $lt: lastMonth }
      }),
      
      // Services livraison actuels
      Shop.countDocuments({
        active: true,
        isDelete: false,
        type: { $in: ['delivery', 'livraison'] },
        createdAt: { $lt: today }
      }),
      // Services livraison mois précédent
      Shop.countDocuments({
        active: true,
        isDelete: false,
        type: { $in: ['delivery', 'livraison'] },
        createdAt: { $lt: lastMonth }
      }),
      
      // Prestataires actuels
      Shop.countDocuments({
        active: true,
        isDelete: false,
        type: { $in: ['service', 'prestataire'] },
        createdAt: { $lt: today }
      }),
      // Prestataires mois précédent
      Shop.countDocuments({
        active: true,
        isDelete: false,
        type: { $in: ['service', 'prestataire'] },
        createdAt: { $lt: lastMonth }
      })
    ])

    const response = {
      total_boutiques: currentTotal,
      total_boutiques_tendance: calculateTrend(currentTotal, previousTotal),
      e_commercants: currentEcommercants,
      e_commercants_tendance: calculateTrend(currentEcommercants, previousEcommercants),
      services_livraison: currentDelivery,
      services_livraison_tendance: calculateTrend(currentDelivery, previousDelivery),
      prestataires: currentPrestataires,
      prestataires_tendance: calculateTrend(currentPrestataires, previousPrestataires)
    }

    return res.status(200).json({
      success: true,
      message: 'Statistiques récupérées avec succès',
      data: response
    })

  } catch (error) {
    console.error('❌ Boutiques Stats API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}