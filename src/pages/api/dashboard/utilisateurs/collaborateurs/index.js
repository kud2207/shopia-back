/**
 * @swagger
 * /api/dashboard/utilisateurs/collaborateurs:
 *   get:
 *     summary: Liste des collaborateurs groupés par boutique
 *     description: |
 *       Retourne la liste des collaborateurs regroupés par boutique avec expansion.
 *       
 *       **Filtres disponibles** :
 *       - `search` : Recherche par nom de boutique
 *       - `role` : vendeur, gestionnaire, admin
 *     tags:
 *       - Utilisateurs - Collaborateurs
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom de boutique
 *
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [vendeur, gestionnaire, admin]
 *         description: Filtrer par rôle
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *
 *     responses:
 *       200:
 *         description: Liste des collaborateurs récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           boutique_id:
 *                             type: string
 *                           nom_boutique:
 *                             type: string
 *                           profil_boutique:
 *                             type: string
 *                           nombre_collaborateurs:
 *                             type: integer
 *                           collaborateurs:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 nom_complet:
 *                                   type: string
 *                                 role:
 *                                   type: string
 *                                 statut:
 *                                   type: string
 *                                 date_creation:
 *                                   type: string
 *                                   format: date
 *                                 derniere_activite:
 *                                   type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         total_pages:
 *                           type: integer
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

    const { 
      search = '', 
      role = '',
      page = 1, 
      limit = 20 
    } = req.query

    // 🔧 Construire les filtres pour les boutiques
    const shopFilter = {}

    if (search) {
      shopFilter.name = { $regex: search, $options: 'i' }
    }

    // Récupérer les boutiques avec leurs collaborateurs
    const shops = await Shop.aggregate([
      { $match: shopFilter },
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: 'shop',
        as: 'collaborateurs'
      }},
      { $addFields: {
        collaborateurs: {
          $filter: {
            input: '$collaborateurs',
            as: 'collab',
            cond: {
              $in: ['$$collab.role', ['vendeur', 'gestionnaire', 'admin_boutique']]
            }
          }
        }
      }},
      { $sort: { createdAt: -1 }},
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) }
    ])

    // Compter le total
    const totalShops = await Shop.countDocuments(shopFilter)

    // Formater les résultats
    const formattedData = await Promise.all(
      shops.map(async (shop) => {
        // Filtrer par rôle si spécifié
        let collaborateurs = shop.collaborateurs
        if (role) {
          const roleFilter = role === 'admin' ? 'admin_boutique' : role
          collaborateurs = shop.collaborateurs.filter(c => c.role === roleFilter)
        }

        const collaborateursFormates = await Promise.all(
          collaborateurs.map(async (collab) => ({
            id: collab._id,
            nom_complet: collab.name,
            role: getRoleLabel(collab.role),
            statut: collab.active ? 'Actif' : 'Désactivé',
            date_creation: collab.createdAt?.toISOString().split('T')[0] || '-',
            derniere_activite: getTimeAgo(collab.updatedAt)
          }))
        )

        return {
          boutique_id: shop._id,
          nom_boutique: shop.name,
          profil_boutique: getShopTypeLabel(shop.type),
          nombre_collaborateurs: collaborateursFormates.length,
          collaborateurs: collaborateursFormates
        }
      })
    )

    return res.status(200).json({
      success: true,
      message: 'Liste des collaborateurs récupérée avec succès',
      data: {
        data: formattedData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalShops,
          total_pages: Math.ceil(totalShops / parseInt(limit))
        }
      }
    })

  } catch (error) {
    console.error('❌ Collaborateurs Liste API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}

// Helper pour les labels de rôle
function getRoleLabel(role) {
  const labels = {
    'vendeur': 'Vendeur',
    'gestionnaire': 'Gestionnaire',
    'admin_boutique': 'Admin Boutique'
  }
  return labels[role] || role
}

// Helper pour les labels de type de boutique
function getShopTypeLabel(type) {
  const labels = {
    'ecommerce': 'E-commerçant',
    'delivery': 'Livreur',
    'service': 'Prestataire'
  }
  return labels[type] || type
}

// Helper pour afficher "Il y a X temps"
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) return `Il y a ${Math.floor(interval)} an(s)`
  
  interval = seconds / 2592000
  if (interval > 1) return `Il y a ${Math.floor(interval)} mois`
  
  interval = seconds / 86400
  if (interval > 1) return `Il y a ${Math.floor(interval)} jour(s)`
  
  interval = seconds / 3600
  if (interval > 1) return `Il y a ${Math.floor(interval)} heure(s)`
  
  interval = seconds / 60
  if (interval > 1) return `Il y a ${Math.floor(interval)} minute(s)`
  
  return 'À l\'instant'
}