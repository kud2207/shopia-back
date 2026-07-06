/**
 * @swagger
 * /api/dashboard/stats-dashboard/charts/commandes:
 *   get:
 *     summary: Volume des commandes
 *     description: |
 *       Retourne le nombre de commandes par période (jour, semaine ou mois).
 *       
 *       **Périodes disponibles** :
 *       - `7d` : 7 derniers jours (regroupement par jour)
 *       - `2w` : 2 dernières semaines (regroupement par jour)
 *       - `4m` : 4 derniers mois (regroupement par mois) - **défaut**
 *       - `12m` : 12 derniers mois (regroupement par mois)
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
 *                   description: Liste des volumes de commandes par période
 *                   items:
 *                     type: object
 *                     properties:
 *                       mois:
 *                         type: string
 *                         description: Label de la période (jour ou mois selon le paramètre period)
 *                         example: juin
 *
 *                       value:
 *                         type: integer
 *                         description: Nombre de commandes pour cette période
 *                         example: 293
 *
 *                   example:
 *                     - mois: mars
 *                       value: 150
 *                     - mois: avr.
 *                       value: 220
 *                     - mois: mai
 *                       value: 180
 *                     - mois: juin
 *                       value: 293
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
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ])

    const map = {}; labels.forEach(l => map[l] = 0)
    data.forEach(item => { map[getLabel(item)] = item.count })
    const result = Object.entries(map).map(([mois, value]) => ({ mois, value }))

    return res.status(200).json({ message: 'Succès', data: result })
  } catch (error) {
    return res.status(500).json({ message: 'Erreur serveur', error: error.message })
  }
}