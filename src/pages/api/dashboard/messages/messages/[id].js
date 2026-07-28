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
    const { id: messageId } = req.query;

    if (req.method === 'DELETE') {
      const result = await DashboardMessage.deleteOne({
        _id: messageId,
        admin: adminId
      });

      if (result.deletedCount === 0) {
        return res.status(444).json({ success: false, message: 'Message introuvable' });
      }

      return res.status(200).json({
        success: true,
        message: 'Message supprimé avec succès'
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Delete message API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}
