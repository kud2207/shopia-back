/**
 * @swagger
 * /api/boutiques/produits:
 *   get:
 *     summary: Catalogue des produits
 *     description: |
 *       Retourne la liste des produits avec leur statut de stock.
 *       
 *       **Statuts de stock** :
 *       - `disponible` : Stock > 10
 *       - `stock_faible` : Stock entre 1 et 10
 *       - `epuise` : Stock = 0
 *     tags:
 *       - Boutiques
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: query
 *         name: boutique_id
 *         schema:
 *           type: string
 *         description: Filtrer par boutique
 *
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par nom de produit
 *
 *       - in: query
 *         name: stock_status
 *         schema:
 *           type: string
 *           enum: [all, disponible, epuise, stock_faible]
 *           default: all
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
 *         description: Produits récupérés avec succès
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
 *                           id:
 *                             type: string
 *                           nom:
 *                             type: string
 *                           image:
 *                             type: string
 *                           prix:
 *                             type: number
 *                           stock:
 *                             type: integer
 *                           vendu:
 *                             type: integer
 *                           echange:
 *                             type: integer
 *                           stock_status:
 *                             type: string
 *                           boutique:
 *                             type: string
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Product from 'src/@apiCore/models/product'
import Shop from 'src/@apiCore/models/shop'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import { Types } from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { 
      boutique_id,
      search = '', 
      stock_status = 'all',
      page = 1, 
      limit = 20 
    } = req.query

    // 🔧 Construire les filtres
    const baseFilter = {}

    // Filtrer par boutique si spécifié
    if (boutique_id && Types.ObjectId.isValid(boutique_id)) {
      baseFilter.shop = new Types.ObjectId(boutique_id)
    }

    // Recherche par nom
    if (search) {
      baseFilter.name = { $regex: search, $options: 'i' }
    }

    // Filtrer par statut de stock
    if (stock_status === 'disponible') {
      baseFilter.stock = { $gt: 10 }
    } else if (stock_status === 'stock_faible') {
      baseFilter.stock = { $gt: 0, $lte: 10 }
    } else if (stock_status === 'epuise') {
      baseFilter.stock = 0
    }

    // Récupérer les produits
    const products = await Product.find(baseFilter)
      .populate('shop', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    // Formater les produits
    const formattedProducts = products.map(product => {
      let stockStatus = 'disponible'
      if (product.stock === 0) stockStatus = 'epuise'
      else if (product.stock <= 10) stockStatus = 'stock_faible'

      return {
        id: product._id,
        nom: product.name,
        image: product.image || '/images/products/default.jpg',
        prix: product.price || 0,
        stock: product.stock || 0,
        vendu: product.sold || 0,
        echange: product.exchanged || 0,
        stock_status: stockStatus,
        boutique: product.shop?.name || 'Inconnue'
      }
    })

    const total = await Product.countDocuments(baseFilter)

    return res.status(200).json({
      success: true,
      message: 'Produits récupérés avec succès',
      data: {
        data: formattedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          total_pages: Math.ceil(total / parseInt(limit))
        }
      }
    })

  } catch (error) {
    console.error('❌ Produits API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}