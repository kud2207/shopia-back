import jwt from 'jsonwebtoken'

/**
 * 🎫 Génère un token JWT
 */
export const signToken = (payload, expiresIn = '3650 days') => {
  return jwt.sign(payload, process.env.JWT_TOKEN, { expiresIn })
}

/**
 * 🔓 Vérifie et décode un token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_TOKEN)
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw new Error('Token expiré')
    if (error.name === 'JsonWebTokenError') throw new Error('Token invalide')
    throw error
  }
}

/**
 * 🍪 Extrait le token depuis header OU cookie
 */
export const extractToken = (req) => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]
  }

  const cookies = req.headers.cookie || ''
  const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('adminToken='))
  
  if (tokenCookie) return tokenCookie.split('=')[1].trim()

  return null
}