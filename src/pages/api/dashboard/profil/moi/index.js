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

    if (req.method === 'GET') {
      const admin = await Admin.findById(adminId).select('+password');
      if (!admin) {
        return res.status(444).json({ success: false, message: 'Administrateur introuvable' });
      }

      // Renvoyer les informations formatées
      return res.status(200).json({
        success: true,
        data: {
          _id: admin._id,
          nom: admin.nom,
          prenom: admin.prenom,
          nom_complet: `${admin.prenom} ${admin.nom}`.trim(),
          email: admin.email,
          role: admin.role,
          avatar: admin.avatar,
          telephone: admin.telephone || '',
          pays: admin.pays || '',
          ville: admin.ville || '',
          preferences: admin.preferences || {
            langue: 'Français',
            formatDate: 'JJ/MM/AA',
            formatHeure: '24 heures',
            fuseauHoraire: 'Afrique/Yaoundé',
            notificationsEmail: true,
            notificationsPush: true
          },
          twoFactor: admin.twoFactor || {
            smsEnabled: false,
            emailEnabled: false
          }
        }
      });
    }

    if (req.method === 'PUT') {
      const { nom_complet, email, telephone, pays, ville, avatar } = req.body;
      
      const updateData = {};
      if (nom_complet) {
        const parts = nom_complet.trim().split(/\s+/);
        updateData.prenom = parts[0] || '';
        updateData.nom = parts.slice(1).join(' ') || '';
      }
      if (email) updateData.email = email;
      if (telephone !== undefined) updateData.telephone = telephone;
      if (pays !== undefined) updateData.pays = pays;
      if (ville !== undefined) updateData.ville = ville;
      if (avatar !== undefined) updateData.avatar = avatar;

      const updatedAdmin = await Admin.findByIdAndUpdate(
        adminId,
        { $set: updateData },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: {
          _id: updatedAdmin._id,
          nom: updatedAdmin.nom,
          prenom: updatedAdmin.prenom,
          nom_complet: `${updatedAdmin.prenom} ${updatedAdmin.nom}`.trim(),
          email: updatedAdmin.email,
          role: updatedAdmin.role,
          avatar: updatedAdmin.avatar,
          telephone: updatedAdmin.telephone || '',
          pays: updatedAdmin.pays || '',
          ville: updatedAdmin.ville || ''
        }
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Profile API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}
