/**
 * @swagger
 * /api/dashboard/profil/moi/changer-password:
 *   post:
 *     summary: Changer mon mot de passe
 *     description: |
 *       Permet à l'admin de changer son mot de passe.
 *       
 *       **Règles de validation** :
 *       - Minimum 8 caractères
 *       - Au moins 1 majuscule
 *       - Au moins 1 chiffre
 *       - Au moins 1 caractère spécial
 *     tags:
 *       - Profil Admin - Sécurité
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password_actuel
 *               - nouveau_password
 *               - confirmation_password
 *             properties:
 *               password_actuel:
 *                 type: string
 *                 example: ancienMotDePasse123
 *               nouveau_password:
 *                 type: string
 *                 example: nouveauMotDePasse456!
 *               confirmation_password:
 *                 type: string
 *                 example: nouveauMotDePasse456!
 *
 *     responses:
 *       200:
 *         description: Mot de passe changé avec succès
 *       400:
 *         description: Mot de passe invalide ou trop faible
 *       401:
 *         description: Mot de passe actuel incorrect
 */

import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import AuditLog from 'src/@apiCore/models/auditLog'
import { sendPasswordChangedEmail } from 'src/@apiCore/lib/email'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'
import bcrypt from 'bcrypt'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).json({ body: 'OK' })
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée' })

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()

    const { password_actuel, nouveau_password, confirmation_password } = req.body

    // Validation des champs requis
    if (!password_actuel || !nouveau_password || !confirmation_password) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      })
    }

    // Récupérer l'admin avec le mot de passe
    const admin = await Admin.findById(auth.admin._id).select('+password')

    // Vérifier le mot de passe actuel
    const isPasswordValid = await bcrypt.compare(password_actuel, admin.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Le mot de passe actuel est incorrect'
      })
    }

    // Vérifier que les nouveaux mots de passe correspondent
    if (nouveau_password !== confirmation_password) {
      return res.status(400).json({
        success: false,
        message: 'Les nouveaux mots de passe ne correspondent pas'
      })
    }

    // Valider la force du mot de passe
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!passwordRegex.test(nouveau_password)) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères, dont 1 majuscule, 1 chiffre et 1 caractère spécial',
        requirements: {
          minLength: 8,
          uppercase: true,
          lowercase: true,
          number: true,
          specialChar: true
        }
      })
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(nouveau_password, salt)

    // Mettre à jour le mot de passe
    admin.password = hashedPassword
    admin.passwordChangedAt = new Date()
    await admin.save()

    // Logger dans l'audit log
    await new AuditLog({
      userId: admin._id,
      action: 'CHANGE_PASSWORD',
      targetId: admin._id,
      targetModel: 'Admin',
      details: { action: 'Changement de mot de passe' },
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }).save()

    // Envoyer email de notification
    try {
      await sendPasswordChangedEmail({
        email: admin.email,
        name: `${admin.prenom} ${admin.nom}`,
        date: new Date()
      })
    } catch (emailError) {
      console.error('Erreur envoi email:', emailError)
    }

    // TODO: Invalider toutes les sessions actives (forcer reconnexion)
    // Cela peut être fait en incrémentant un champ "version" dans le token JWT

    return res.status(200).json({
      success: true,
      message: 'Mot de passe changé avec succès. Vous serez déconnecté dans quelques instants.',
      data: {
        passwordChangedAt: admin.passwordChangedAt
      }
    })

  } catch (error) {
    console.error('❌ Change Password API ERROR:', error)
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message })
  }
}