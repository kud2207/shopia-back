import dbConnect from 'src/@apiCore/lib/mongodb'
import Notification from 'src/@apiCore/models/notifications'
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

    if (req.method === 'GET') {
      const adminId = auth.admin._id;
      const count = await Notification.countDocuments({ toChannel: adminId, read: false });
      return res.status(200).json({
        success: true,
        count
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Notifications count API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}
