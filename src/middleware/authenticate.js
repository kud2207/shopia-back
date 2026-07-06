import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'

const authenticate = (req, res) => {
  try {
    let token = req.headers?.authorization?.split(' ')[1]
    if (!token && req.cookies) {
      cookieParser()(req, res, () => {})
      if (req.cookies.token) {
        const tokenData = JSON.parse(req.cookies.token)
        token = tokenData?.token
      }
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied: No token provided' })
    }

    const decodedToken = jwt.verify(token, process.env.JWT_TOKEN)
    if (!decodedToken) {
      return res.status(401).json({ success: false, message: 'Access denied: Invalid token' })
    }

    if (Math.floor(Date.now() / 1000) > decodedToken.exp) {
      return res.status(401).json({ success: false, message: 'Access denied: Token expired' })
    }

    req.userId = decodedToken.userId
    req.user = decodedToken;
    
    return
  } catch (error) {
    console.error('JWT verification error:', error)
    return res.status(401).json({ success: false, message: 'Access denied: Invalid token' })
  }
}

export default authenticate
