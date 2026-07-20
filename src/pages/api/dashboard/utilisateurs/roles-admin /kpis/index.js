/**
 * @swagger
 * /api/dashboard/utilisateurs/roles-admin/kpis:
 *   get:
 *     summary: KPIs des administrateurs par rôle
 *     description: |
 *       Retourne les indicateurs clés des administrateurs par type de rôle.
 *       
 *       **Métriques** :
 *       - Super Admin
 *       - Admin Support
 *       - Admin Financier
 *       - Admin Commercial
 *     tags:
 *       - Utilisateurs - Rôles admin
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
 *                 super_admin:
 *                   type: integer
 *                   example: 2
 *                 super_admin_tendance:
 *                   type: number
 *                   example: 1
 *                 admin_support:
 *                   type: integer
 *                   example: 2
 *                 admin_support_tendance:
 *                   type: number
 *                   example: 0
 *                 admin_financier:
 *                   type: integer
 *                   example: 5
 *                 admin_financier_tendance:
 *                   type: number
 *                   example: 2
 *                 admin_commercial:
 *                   type: integer
 *                   example: 3
 *                 admin_commercial_tendance:
 *                   type: number
 *                   example: 0
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
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
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // 📊 Calculer les KPIs par rôle en parallèle
    const [
      currentSuperAdmin,
      previousSuperAdmin,
      currentSupport,
      previousSupport,
      currentFinancier,
      previousFinancier,
      currentCommercial,
      previousCommercial
    ] = await Promise.all([
      // Super Admin
      Admin.countDocuments({ role: 'super_admin', active: true }),
      Admin.countDocuments({ role: 'super_admin', createdAt: { $gte: previousMonthStart } }),
      
      // Admin Support
      Admin.countDocuments({ role: 'admin_support', active: true }),
      Admin.countDocuments({ role: 'admin_support', createdAt: { $gte: previousMonthStart } }),
      
      // Admin Financier
      Admin.countDocuments({ role: 'admin_financier', active: true }),
      Admin.countDocuments({ role: 'admin_financier', createdAt: { $gte: previousMonthStart } }),
      
      // Admin Commercial
      Admin.countDocuments({ role: 'admin_commercial', active: true }),
      Admin.countDocuments({ role: 'admin_commercial', createdAt: { $gte: previousMonthStart } })
    ])

    // Calculer les tendances
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0
      return Number((((current - previous) / previous) * 100).toFixed(1))
    }

    return res.status(200).json({
      success: true,
      message: 'KPIs administrateurs récupérés avec succès',
      data: {
        super_admin: currentSuperAdmin,
        super_admin_tendance: calculateTrend(currentSuperAdmin, previousSuperAdmin),
        admin_support: currentSupport,
        admin_support_tendance: calculateTrend(currentSupport, previousSupport),
        admin_financier: currentFinancier,
        admin_financier_tendance: calculateTrend(currentFinancier, previousFinancier),
        admin_commercial: currentCommercial,
        admin_commercial_tendance: calculateTrend(currentCommercial, previousCommercial)
      }
    })

  } catch (error) {
    console.error('❌ Admins KPIs API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}