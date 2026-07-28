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
      const list = await Notification.find({ toChannel: adminId }).sort({ createdAt: -1 });

      const mapped = list.map(item => {
        const title = (item.title || '').toLowerCase();
        const content = (item.content || '').toLowerCase();
        
        let type = 'alerte';
        let category = 'Nouveau';
        let color = 'blue';
        let icon = 'alert';

        if (title.includes('inscription') || content.includes('inscrits') || content.includes('inscription') || content.includes('e-commerçant')) {
          type = 'inscription';
          category = 'Nouveau';
          color = 'violet';
          icon = 'arrow-in';
        } else if (title.includes('stock') || content.includes('stock') || title.includes('critique')) {
          type = 'stock';
          category = 'Critique';
          color = 'red';
          icon = 'alert';
        } else if (title.includes('transaction') || title.includes('bloquée') || content.includes('bloqué') || title.includes('finance')) {
          type = 'transaction';
          category = 'Critique';
          color = 'red';
          icon = 'exchange';
        } else if (title.includes('ticket') || content.includes('ticket') || title.includes('support') || title.includes('résolu')) {
          type = 'ticket';
          category = 'Support';
          color = 'gray';
          icon = 'ticket';
        }

        return {
          _id: item._id,
          title: item.title,
          content: item.content,
          read: item.read,
          createdAt: item.createdAt,
          redirectionLink: item.redirectionLink,
          redirectionLabel: item.redirectionLabel,
          type,
          category,
          color,
          icon
        };
      });

      return res.status(200).json({
        success: true,
        data: mapped
      });
    }

    return res.status(405).json({ message: 'Méthode non autorisée' })

  } catch (error) {
    console.error('❌ Notifications API ERROR:', error)
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    })
  }
}
