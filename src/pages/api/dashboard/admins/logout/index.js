/**
 * @swagger
 * /api/dashboard/admins/logout:
 *   post:
 *     summary: Déconnexion administrateur
 *     description: Déconnecte l'administrateur en supprimant le cookie d'authentification
 *     tags:
 *       - Admin Authentication
 *
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: adminToken=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Déconnecté avec succès
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
 *                   example: Erreur lors de la déconnexion
 *                 error:
 *                   type: string
 *                   example: Détails de l'erreur
 */


export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    res.setHeader('Set-Cookie', [
      'adminToken=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
    ])

    return res.status(200).json({
      message: 'Déconnecté avec succès'
    })
  } catch (error) {
    return res.status(500).json({ 
      message: 'Erreur lors de la déconnexion',
      error: error.message 
    })
  }
}