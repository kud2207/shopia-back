/**
 * @swagger
 * /api/boutiques/shopbot/statuts:
 *   get:
 *     summary: Statuts des bots par boutique
 *     description: Liste toutes les boutiques avec le statut de leur bot ShopBot
 *     tags:
 *       - Boutiques - ShopBot
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Statuts récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       boutique:
 *                         type: string
 *                       statut:
 *                         type: string
 *                         enum: [Actif, Erreur, Inactif]
 *                       interactions:
 *                         type: integer
 *                       taux_conversion:
 *                         type: number
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Shop from 'src/@apiCore/models/shop'
import Order from 'src/@apiCore/models/order'
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

    // Récupérer toutes les boutiques
    const shops = await Shop.find({})
      .select('name shopbotActive shopbotStatus')
      .sort({ name: 1 })

    // Calculer les stats pour chaque boutique
    const shopsWithStats = await Promise.all(
      shops.map(async (shop) => {
        const ordersCount = await Order.countDocuments({
          shop: shop._id,
          source: 'shopbot',
          status: { $in: ['Livrée', 'Terminée'] }
        })

        // Simuler les interactions (à remplacer par vraie collection)
        const interactions = Math.floor(Math.random() * 200) + 50
        const conversionRate = interactions > 0 
          ? parseFloat(((ordersCount / interactions) * 100).toFixed(1))
          : 0

        let statut = 'Inactif'
        if (shop.shopbotActive) {
          statut = shop.shopbotStatus === 'error' ? 'Erreur' : 'Actif'
        }

        return {
          boutique: shop.name,
          statut: statut,
          interactions: interactions,
          taux_conversion: conversionRate
        }
      })
    )

    return res.status(200).json({
      success: true,
      message: 'Statuts des bots récupérés avec succès',
      data: shopsWithStats
    })

  } catch (error) {
    console.error('❌ ShopBot Statuts API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}