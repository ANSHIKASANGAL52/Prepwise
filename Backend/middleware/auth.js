const jwt = require('jsonwebtoken')
const User = require('../models/User')

module.exports = async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ message: 'Sign in to continue.' })
    const { id } = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(id).select('_id name email')
    if (!req.user) return res.status(401).json({ message: 'Account no longer exists.' })
    return next()
  } catch {
    return res.status(401).json({ message: 'Your session expired. Please sign in again.' })
  }
}
