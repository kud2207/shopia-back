/**
 * @swagger
 * /api/dashboard/utilisateurs/roles-admin/roles-disponibles:
 *   get:
 *     summary: Liste des rôles disponibles
 *     description: Retourne la liste des rôles avec leurs permissions par défaut
 *     tags:
 *       - Utilisateurs - Rôles admin
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Liste des rôles récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       nom:
 *                         type: string
 *                       description:
 *                         type: string
 *                       permissions_defaut:
 *                         type: array
 *                         items:
 *                           type: string
 */

import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    // Pas besoin de DB pour cette endpoint statique
    const roles = [
      {
        id: 'super_admin',
        nom: 'Super Admin',
        description: 'Accès complet à tous les modules',
        permissions_defaut: ['*']
      },
      {
        id: 'admin_support',
        nom: 'Admin Support',
        description: 'Consultation boutiques, gestion tickets',
        permissions_defaut: ['consultation_boutiques', 'gestion_tickets', 'messagerie']
      },
      {
        id: 'admin_financier',
        nom: 'Admin Financier',
        description: 'Module financier uniquement',
        permissions_defaut: ['module_financier', 'rapports', 'abonnements']
      },
      {
        id: 'admin_commercial',
        nom: 'Admin Commercial',
        description: 'Suivi activité boutiques, relances',
        permissions_defaut: ['suivi_activite', 'relances_abonnes', 'performance']
      }
    ]

    return res.status(200).json({
      success: true,
      roles
    })

  } catch (error) {
    console.error('❌ Rôles disponibles API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}