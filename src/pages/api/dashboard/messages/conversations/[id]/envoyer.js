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

    if (req.method === 'POST') {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, message: 'Le message ne peut pas être vide' });
      }

      const newMessage = new DashboardMessage({
        sender: adminId,
        senderModel: 'Admin',
        receiver: userId,
        receiverModel: 'User',
        user: userId,
        admin: adminId,
        text,
        read: false
      });

      await newMessage.save();

      return res.status(201).json({
        success: true,
        message: 'Message envoyé avec succès',
        data: {
          _id: newMessage._id,
          sender: newMessage.sender,
          senderModel: newMessage.senderModel,
          receiver: newMessage.receiver,
          receiverModel: newMessage.receiverModel,
          text: newMessage.text,
          read: newMessage.read,
          createdAt: newMessage.createdAt
        }
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Send message API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}
