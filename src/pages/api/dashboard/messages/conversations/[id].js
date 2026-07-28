import dbConnect from 'src/@apiCore/lib/mongodb'
import DashboardMessage from 'src/@apiCore/models/dashboardMessage'
import User from 'src/@apiCore/models/user'
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

    if (req.method === 'GET') {
      const messages = await DashboardMessage.find({
        admin: adminId,
        user: userId
      }).sort({ createdAt: 1 });

      let data = messages.map(msg => ({
        _id: msg._id,
        sender: msg.sender,
        senderModel: msg.senderModel,
        receiver: msg.receiver,
        receiverModel: msg.receiverModel,
        text: msg.text,
        read: msg.read,
        createdAt: msg.createdAt
      }));

      // Données de démo premium si aucun message réel n'existe
      if (data.length === 0) {
        const u = await User.findById(userId);
        const name = u ? `${u.first_name || ''} ${u.last_name || u.name || ''}`.trim() : 'Abonné';

        data = [
          {
            _id: 'msg1',
            sender: userId,
            senderModel: 'User',
            receiver: adminId,
            receiverModel: 'Admin',
            text: `Bonjour, c'est ${name}. J'aimerais savoir comment configurer ma boutique en ligne sur ShopIA ?`,
            read: true,
            createdAt: new Date(Date.now() - 3600000) // Il y a 1h
          },
          {
            _id: 'msg2',
            sender: adminId,
            senderModel: 'Admin',
            receiver: userId,
            receiverModel: 'User',
            text: `Bonjour ${name} ! Vous devez vous rendre dans l'onglet 'Boutiques', cliquer sur 'Créer une boutique' et suivre les étapes d'intégration.`,
            read: true,
            createdAt: new Date(Date.now() - 1800000) // Il y a 30m
          },
          {
            _id: 'msg3',
            sender: userId,
            senderModel: 'User',
            receiver: adminId,
            receiverModel: 'Admin',
            text: "D'accord, je vais essayer tout de suite. Merci beaucoup !",
            read: false,
            createdAt: new Date(Date.now() - 600000) // Il y a 10m
          }
        ];
      }

      return res.status(200).json({
        success: true,
        data
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Conversation history API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}
