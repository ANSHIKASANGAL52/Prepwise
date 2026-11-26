const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const requireAuth = require('../middleware/auth')

const router = express.Router()
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email })
const issueToken = (user) => jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 8) {
      return res.status(400).json({ message: 'Add your name, a valid email, and a password with at least 8 characters.' })
    }
    const exists = await User.exists({ email: email.toLowerCase().trim() })
    if (exists) return res.status(409).json({ message: 'An account with that email already exists.' })
    const user = await User.create({ name: name.trim(), email, password: await bcrypt.hash(password, 12) })
    return res.status(201).json({ user: publicUser(user), token: issueToken(user) })
  } catch (error) {
    return res.status(500).json({ message: 'Could not create your account.', detail: error.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: (req.body.email || '').toLowerCase().trim() }).select('+password')
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) {
      return res.status(401).json({ message: 'Email or password did not match.' })
    }
    return res.json({ user: publicUser(user), token: issueToken(user) })
  } catch (error) {
    return res.status(500).json({ message: 'Could not sign in.', detail: error.message })
  }
})

router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.user)))

module.exports = router
