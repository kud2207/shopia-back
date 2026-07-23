/**
 * @swagger
 * /api/dashboard/utilisateurs/tickets/admins-disponibles:
 *   get:
 *     summary: Liste des admins disponibles pour assignation
 *     description: |
 *       Retourne la liste des administrateurs pouvant recevoir des tickets.
 *       
 *       **Filtre** : Admin Support et Super Admin uniquement
 *     tags:
 *       - Utilisateurs - Support & tickets
 *     security:
 *       - bearerAuth: []
 *
 *     responses:
 *       200:
 *         description: Liste des admins récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 admins:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       nom_complet:
 *                         type: string
 *                       role:
 *                         type: string
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

    // Récupérer les admins pouvant recevoir des tickets
    const admins = await Admin.find({
      role: { $in: ['super_admin', 'admin_support'] },
      active: true
    })
      .select('name role email')
      .sort({ name: 1 })

    const formattedAdmins = admins.map(admin => ({
      id: admin._id,
      nom_complet: `${admin.prenom} ${admin.nom}`,
      role: getRoleLabel(admin.role),
      email: admin.email
    }))

    return res.status(200).json({
      success: true,
      admins: formattedAdmins
    })

  } catch (error) {
    console.error('❌ Available Admins API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

function getRoleLabel(role) {
  const labels = {
    'super_admin': 'Super Admin',
    'admin_support': 'Admin Support'
  }
  return labels[role] || role
}