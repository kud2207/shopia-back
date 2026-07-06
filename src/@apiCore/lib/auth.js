import jwt from 'jsonwebtoken'

/**
 * 🔐 Vérifie si un token JWT est valide
 * @param {string} token - Le token JWT à vérifier
 * @returns {boolean} true si valide, false si invalide/expiré
 */
export function verifyAuth(token) {
  try {
    if (!token) return false

    const secret = process.env.JWT_TOKEN || ''
    jwt.verify(token, secret)
    
    return true
  } catch (error) {
    return false
  }
}

/**
 * 📦 Extrait le token depuis les headers ou cookies
 * @param {object} headers - Les headers de la requête
 * @returns {string|null} Le token ou null
 */
export function extractToken(headers) {
  // 1. Header Authorization: Bearer <token>
  const authHeader = headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]
  } 

  // 2. Cookie adminToken
  const cookie = headers.cookie || ''
  const match = cookie.match(/adminToken=([^;]+)/)
  if (match) return match[1].trim()

  return null
}