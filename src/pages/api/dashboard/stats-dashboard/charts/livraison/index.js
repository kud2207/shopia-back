/**
 * @swagger
 * /api/dashboard/stats-dashboard/charts/livraison:
 *   get:
 *     summary: Taux de livraison
 *     description: |
 *       Retourne le nombre de commandes livrées et non livrées par période.
 *       
 *       **Périodes disponibles** :
 *       - `7d` : 7 derniers jours (regroupement par jour)
 *       - `2w` : 2 dernières semaines (regroupement par jour)
 *       - `4m` : 4 derniers mois (regroupement par mois) - **défaut**
 *       - `12m` : 12 derniers mois (regroupement par mois)
 *       
 *       **Statuts pris en compte** :
 *       - ✅ Livrées : statut "Livrée"
 *       - ❌ Non livrées : statuts "Non livrée" et "Annulée"
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
 *                   description: Liste des livraisons par période
 *                   items:
 *                     type: object
 *                     properties:
 *                       mois:
 *                         type: string
 *                         description: Label de la période (jour ou mois selon le paramètre period)
 *                         example: juin
 *
 *                       livrees:
 *                         type: integer
 *                         description: Nombre de commandes livrées
 *                         example: 85
 *
 *                       non_livrees:
 *                         type: integer
 *                         description: Nombre de commandes non livrées (inclut "Non livrée" et "Annulée")
 *                         example: 15
 *
 *                   example:
 *                     - mois: mars
 *                       livrees: 120
 *                       non_livrees: 30
 *                     - mois: avr.
 *                       livrees: 145
 *                       non_livrees: 25
 *                     - mois: mai
 *                       livrees: 180
 *                       non_livrees: 20
 *                     - mois: juin
 *                       livrees: 210
 *                       non_livrees: 18
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
      { $match: { createdAt: { $gte: startDate }, status: { $in: ['Livrée', 'Non livrée', 'Annulée'] } } },
      { $group: { 
          _id: groupBy,
          livrees: { $sum: { $cond: [{ $eq: ['$status', 'Livrée'] }, 1, 0] } },
          nonLivrees: { $sum: { $cond: [{ $in: ['$status', ['Non livrée', 'Annulée']] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ])

    const map = {}; labels.forEach(l => map[l] = { livrees: 0, non_livrees: 0 })
    data.forEach(item => { map[getLabel(item)] = { livrees: item.livrees, non_livrees: item.nonLivrees } })
    const result = Object.entries(map).map(([mois, d]) => ({ mois, ...d }))

    return res.status(200).json({ message: 'Succès', data: result })
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message })
  }
}