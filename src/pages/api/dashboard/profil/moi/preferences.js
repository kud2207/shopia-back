import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import { withAuth } from 'src/@apiCore/middlewares/authMiddleware'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }

  try {
    const auth = await withAuth({ 
      roles: ['super_admin', 'admin_support', 'admin_financier', 'admin_commercial'] 
    })(req, res)
    if (auth.error) return auth.error

    await dbConnect()
    const adminId = auth.admin._id;

    if (req.method === 'PUT') {
      const {
        langue,
        formatDate,
        formatHeure,
        fuseauHoraire,
        notificationsEmail,
        notificationsPush
      } = req.body;

      const updateFields = {};
      if (langue !== undefined) updateFields['preferences.langue'] = langue;
      if (formatDate !== undefined) updateFields['preferences.formatDate'] = formatDate;
      if (formatHeure !== undefined) updateFields['preferences.formatHeure'] = formatHeure;
      if (fuseauHoraire !== undefined) updateFields['preferences.fuseauHoraire'] = fuseauHoraire;
      if (notificationsEmail !== undefined) updateFields['preferences.notificationsEmail'] = notificationsEmail;
      if (notificationsPush !== undefined) updateFields['preferences.notificationsPush'] = notificationsPush;

      const updated = await Admin.findByIdAndUpdate(
        adminId,
        { $set: updateFields },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Préférences mises à jour avec succès',
        data: updated.preferences
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Preferences API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}
