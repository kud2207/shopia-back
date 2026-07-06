import dbConnect from 'src/@apiCore/lib/mongodb'
import Admin from 'src/@apiCore/models/admin'
import { extractToken, verifyToken } from 'src/@apiCore/lib/jwt'

/**
 * 🛡️ Middleware d'authentification admin
 */
export const withAuth = (options = {}) => {
  const { 
    required = true, 
    roles = null, 
    allowFirstAdmin = false 
  } = options

  return async (req, res) => {
    await dbConnect()

    // 🔍 Cas spécial : premier admin (bootstrap)
    if (allowFirstAdmin) {
      const adminCount = await Admin.countDocuments({})
      if (adminCount === 0) {
        return { isFirstAdmin: true, admin: null }
      }
    }

    // 🔐 Extraction du token
    const token = extractToken(req)
    
    if (!token) {
      if (!required) return { isFirstAdmin: false, admin: null }
      return { 
        error: res.status(401).json({ message: 'Token d\'authentification requis' }) 
      }
    }

    // 🔓 Vérification du token
    let decoded
    try {
      decoded = verifyToken(token)
    } catch (error) {
      return { 
        error: res.status(401).json({ message: error.message || 'Token invalide ou expiré' }) 
      }
    }

    // 👤 Chargement de l'admin
    const admin = await Admin.findById(decoded.adminId)
    
    if (!admin) {
      return { 
        error: res.status(403).json({ message: 'Administrateur non trouvé' }) 
      }
    }

    if (!admin.active) {
      return { 
        error: res.status(403).json({ message: 'Compte administrateur désactivé' }) 
      }
    }

    // 🎯 Vérification des rôles
    if (roles && !roles.includes(admin.role)) {
      return { 
        error: res.status(403).json({ 
          message: 'Permissions insuffisantes',
          requiredRoles: roles,
          yourRole: admin.role
        }) 
      }
    }

    return { isFirstAdmin: false, admin }
  }
}