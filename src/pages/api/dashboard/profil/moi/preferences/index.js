/**
 * @swagger
 * /api/dashboard/profil/moi/preferences:
 *   put:
 *     summary: Mettre à jour mes préférences
 *     description: |
 *       Met à jour les préférences d'affichage et de notification de l'admin.
 *     tags:
 *       - Profil Admin
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               langue:
 *                 type: string
 *                 enum: [fr, en]
 *                 example: fr
 *               format_date:
 *                 type: string
 *                 enum: [JJ/MM/AA, MM/JJ/AA, AA/MM/JJ]
 *                 example: JJ/MM/AA
 *               format_heure:
 *                 type: string
 *                 enum: [12h, 24h]
 *                 example: 24h
 *               fuseau_horaire:
 *                 type: string
 *                 example: Afrique/Yaounde
 *               notifications_email:
 *                 type: boolean
 *                 example: true
 *               notifications_push:
 *                 type: boolean
 *                 example: true
 *
 *     responses:
 *       200:
 *         description: Préférences mises à jour avec succès
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { 
      langue, 
      format_date, 
      format_heure, 
      fuseau_horaire, 
      notifications_email, 
      notifications_push 
    } = req.body

    const admin = await Admin.findById(auth.admin._id)

    // Mettre à jour les préférences
    if (!admin.preferences) {
      admin.preferences = {}
    }

    if (langue !== undefined) admin.preferences.langue = langue
    if (format_date !== undefined) admin.preferences.format_date = format_date
    if (format_heure !== undefined) admin.preferences.format_heure = format_heure
    if (fuseau_horaire !== undefined) admin.preferences.fuseau_horaire = fuseau_horaire
    if (notifications_email !== undefined) admin.preferences.notifications_email = notifications_email
    if (notifications_push !== undefined) admin.preferences.notifications_push = notifications_push

    await admin.save()

    return res.status(200).json({
      success: true,
      message: 'Préférences mises à jour avec succès',
      data: {
        preferences: admin.preferences
      }
    })

  } catch (error) {
    console.error('❌ Préférences API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}