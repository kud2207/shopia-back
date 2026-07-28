import dbConnect from 'src/@apiCore/lib/mongodb'
import DashboardMessage from 'src/@apiCore/models/dashboardMessage'
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
    const { id: userId } = req.query; // ID de l'abonné

    if (req.method === 'PATCH' || req.method === 'PUT' || req.method === 'POST') {
      const result = await DashboardMessage.updateMany(
        {
          admin: adminId,
          user: userId,
          receiver: adminId,
          read: false
        },
        { $set: { read: true } }
      );

      return res.status(200).json({
        success: true,
        message: 'Conversation marquée comme lue',
        modifiedCount: result.modifiedCount
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Mark conversation as read API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}
