/**
 * @swagger
 * /api/dashboard/stats-dashboard/charts/revenus:
 *   get:
 *     summary: Revenus par module
 *     description: |
 *       Retourne les revenus (CA) par type de module/boutique pour chaque période.
 *       
 *       **Périodes disponibles** :
 *       - `7d` : 7 derniers jours (regroupement par jour)
 *       - `2w` : 2 dernières semaines (regroupement par jour)
 *       - `4m` : 4 derniers mois (regroupement par mois) - **défaut**
 *       - `12m` : 12 derniers mois (regroupement par mois)
 *       
 *       **Types de modules** :
 *       - 🏪 Marchands : boutiques de type "product", "marchand", "ecommerce"
 *       - 🚚 Livraison : boutiques de type "delivery", "livraison"
 *       - 🛠️ Prestataires : boutiques de type "service", "prestataire"
 *       
 *       **Note** : Seules les commandes "Livrée" et "Terminée" sont comptabilisées.
 *     tags:
 *       - stats-dashboard
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum:
 *             - 7d
 *             - 2w
 *             - 4m
 *             - 12m
 *           default: 4m
 *         description: Période à afficher (jours, semaines ou mois)
 *         example: 4m
 *
 *     responses:
 *       200:
 *         description: Données récupérées avec succès
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
 *                   type: array
 *                   description: Liste des revenus par période et par module
 *                   items:
 *                     type: object
 *                     properties:
 *                       mois:
 *                         type: string
 *                         description: Label de la période (jour ou mois selon le paramètre period)
 *                         example: juin
 *
 *                       marchands:
 *                         type: integer
 *                         description: Revenus des boutiques marchands (arrondi)
 *                         example: 120000
 *
 *                       livraison:
 *                         type: integer
 *                         description: Revenus des boutiques livraison (arrondi)
 *                         example: 80000
 *
 *                       prestataires:
 *                         type: integer
 *                         description: Revenus des boutiques prestataires (arrondi)
 *                         example: 40000
 *
 *                   example:
 *                     - mois: mars
 *                       marchands: 120000
 *                       livraison: 80000
 *                       prestataires: 40000
 *                     - mois: avr.
 *                       marchands: 135000
 *                       livraison: 85000
 *                       prestataires: 45000
 *                     - mois: mai
 *                       marchands: 150000
 *                       livraison: 90000
 *                       prestataires: 50000
 *                     - mois: juin
 *                       marchands: 180000
 *                       livraison: 95000
 *                       prestataires: 55000
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
import Order from 'src/@apiCore/models/order'
import { getChartPeriodConfig } from 'src/@apiCore/lib/chartPeriod'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] })(req, res)
    if (auth.error) return auth.error

    const { startDate, labels, groupBy, getLabel } = getChartPeriodConfig(req.query.period || '4m')

    const data = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: { $in: ['Livrée', 'Terminée'] } } },
      { $lookup: { from: 'shops', localField: 'shop', foreignField: '_id', as: 'shopInfo' } },
      { $unwind: { path: '$shopInfo', preserveNullAndEmptyArrays: true } },
      { $group: { 
          _id: { ...groupBy, shopType: { $ifNull: ['$shopInfo.type', 'product'] } },
          revenue: { $sum: { $ifNull: ['$total', 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ])

    const map = {}; labels.forEach(l => map[l] = { marchands: 0, livraison: 0, prestataires: 0 })
    
    data.forEach(item => {
      const label = getLabel(item)
      const type = item._id.shopType || 'product'
      if (['product', 'marchand', 'ecommerce'].includes(type)) map[label].marchands += item.revenue
      else if (['delivery', 'livraison'].includes(type)) map[label].livraison += item.revenue
      else if (['service', 'prestataire'].includes(type)) map[label].prestataires += item.revenue
      else map[label].marchands += item.revenue
    })

    const result = Object.entries(map).map(([mois, d]) => ({
      mois, marchands: Math.round(d.marchands), livraison: Math.round(d.livraison), prestataires: Math.round(d.prestataires)
    }))

    return res.status(200).json({ message: 'Succès', data: result })
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message })
  }
}