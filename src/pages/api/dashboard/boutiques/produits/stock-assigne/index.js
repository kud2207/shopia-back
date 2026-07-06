/**
 * @swagger
 * /api/boutiques/produits/stock-assigne:
 *   get:
 *     summary: Stock assigné par livreur
 *     description: Retourne le stock de produits assigné à chaque livreur
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
 *
 *       - in: query
 *         name: livreur_id
 *         schema:
 *           type: string
 *
 *     responses:
 *       200:
 *         description: Stock assigné récupéré
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
 *                       produit:
 *                         type: string
 *                       livreur:
 *                         type: string
 *                       quantite_assignee:
 *                         type: integer
 *                       vendue:
 *                         type: integer
 *                       echangee:
 *                         type: integer
 *                       reste:
 *                         type: integer
 *                       alerte:
 *                         type: string
 *                         enum: [disponible, epuise, stock_faible]
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Product from 'src/@apiCore/models/product'
import User from 'src/@apiCore/models/user'
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

    const { boutique_id, livreur_id } = req.query

    // 🔧 Construire les filtres
    const baseFilter = {
      assignedTo: { $exists: true, $ne: null }
    }

    if (boutique_id && Types.ObjectId.isValid(boutique_id)) {
      baseFilter.shop = new Types.ObjectId(boutique_id)
    }

    if (livreur_id && Types.ObjectId.isValid(livreur_id)) {
      baseFilter.assignedTo = new Types.ObjectId(livreur_id)
    }

    // Récupérer les produits assignés
    const products = await Product.find(baseFilter)
      .populate('shop', 'name')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })

    // Formater les données
    const formattedData = products.map(product => {
      const reste = (product.stock || 0) - (product.sold || 0) - (product.exchanged || 0)
      
      let alerte = 'disponible'
      if (reste === 0) alerte = 'epuise'
      else if (reste <= 5) alerte = 'stock_faible'

      return {
        produit: product.name,
        livreur: product.assignedTo?.name || 'Non assigné',
        quantite_assignee: product.stock || 0,
        vendue: product.sold || 0,
        echangee: product.exchanged || 0,
        reste: Math.max(0, reste),
        alerte: alerte
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Stock assigné récupéré avec succès',
      data: formattedData
    })

  } catch (error) {
    console.error('❌ Stock Assigné API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}