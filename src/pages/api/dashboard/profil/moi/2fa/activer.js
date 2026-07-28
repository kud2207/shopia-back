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

    if (req.method === 'POST') {
      const { type } = req.body; // 'sms' or 'email'

      const updateFields = {};
      if (type === 'sms') {
        updateFields['twoFactor.smsEnabled'] = true;
      } else if (type === 'email') {
        updateFields['twoFactor.emailEnabled'] = true;
      } else {
        return res.status(400).json({ success: false, message: 'Type de 2FA non supporté' });
      }

      const updated = await Admin.findByIdAndUpdate(
        adminId,
        { $set: updateFields },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: '2FA activé avec succès',
        data: updated.twoFactor
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Activate 2FA API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}
