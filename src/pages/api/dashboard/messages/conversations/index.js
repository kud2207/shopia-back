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

    if (req.method === 'GET') {
      // Rechercher les messages de cet admin
      const messages = await DashboardMessage.find({ admin: adminId })
        .populate('user')
        .sort({ createdAt: -1 });

      const conversationsMap = {};

      messages.forEach(msg => {
        const userId = msg.user?._id?.toString();
        if (!userId) return;

        if (!conversationsMap[userId]) {
          conversationsMap[userId] = {
            _id: userId,
            user: {
              _id: userId,
              nom_complet: `${msg.user.first_name || ''} ${msg.user.last_name || msg.user.name || ''}`.trim() || 'Abonné ShopIA',
              avatar: msg.user.image || '/images/user/user-01.jpg',
              role: msg.user.role || 'E-commerçant'
            },
            lastMessage: msg.text,
            createdAt: msg.createdAt,
            unreadCount: 0,
            read: msg.read
          };
        }

        // Compter les non lus pour l'admin
        if (!msg.read && msg.receiver.toString() === adminId.toString()) {
          conversationsMap[userId].unreadCount += 1;
        }
      });

      let data = Object.values(conversationsMap);

      // Si aucune conversation n'est présente, on génère un jeu de données de démo premium
      if (data.length === 0) {
        // Essayer de trouver des utilisateurs réels dans la base de données
        const realUsers = await User.find({}).limit(5);
        const demoUsers = realUsers.length > 0 ? realUsers.map(u => ({
          _id: u._id.toString(),
          nom_complet: `${u.first_name || ''} ${u.last_name || u.name || ''}`.trim() || 'Utilisateur ShopIA',
          avatar: u.image || '/images/user/user-02.jpg',
          role: u.role || 'E-commerçant'
        })) : [
          { _id: 'user1', nom_complet: 'Terry Franci', avatar: '/images/user/user-02.jpg', role: 'E-commerçant' },
          { _id: 'user2', nom_complet: 'Alena Franci', avatar: '/images/user/user-03.jpg', role: 'Livreur' },
          { _id: 'user3', nom_complet: 'Jocelyn Kenter', avatar: '/images/user/user-04.jpg', role: 'Prestataire' },
          { _id: 'user4', nom_complet: 'Brandon Philips', avatar: '/images/user/user-05.jpg', role: 'E-commerçante' }
        ];

        const demoMessages = [
          "Bonjour, j'ai besoin d'aide pour configurer mon catalogue de produits.",
          "Mon paiement a été bloqué pour la commande #1024, que faire ?",
          "Le ticket-002 est résolu, merci pour la réactivité !",
          "Pouvez-vous valider mon inscription en tant que livreur ?"
        ];

        data = demoUsers.map((u, i) => ({
          _id: u._id,
          user: u,
          lastMessage: demoMessages[i % demoMessages.length],
          createdAt: new Date(Date.now() - i * 3600000),
          unreadCount: i === 0 ? 2 : 0,
          read: i === 0 ? false : true
        }));
      }

      // Trier les conversations par date du dernier message descendante
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.status(200).json({
        success: true,
        data
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Conversations API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}
