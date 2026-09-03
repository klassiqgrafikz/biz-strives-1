import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { queryOne, queryInsert, queryAll } from '../db/pool.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const TOKEN_EXPIRY = '7d'

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// Auth middleware
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)
  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' })
  }
  req.user = decoded
  next()
}

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, username, created_at FROM users WHERE id = $1', [req.user.id])
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user })
  } catch (err) {
    console.error('GET /auth/me error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/register (first user only)
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'Username and password (min 6 chars) required' })
    }

    const existing = await queryOne('SELECT COUNT(*) as c FROM users')
    if (parseInt(existing.c) > 0) {
      return res.status(409).json({ error: 'Admin already exists' })
    }

    const hash = await bcrypt.hash(password, 10)
    const user = await queryInsert(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, hash]
    )

    const token = generateToken(user)
    res.json({ user: { id: user.id, username: user.username }, token })
  } catch (err) {
    console.error('POST /auth/register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const user = await queryOne('SELECT * FROM users WHERE username = $1', [username])
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const token = generateToken(user)
    res.json({ user: { id: user.id, username: user.username }, token })
  } catch (err) {
    console.error('POST /auth/login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/auth/logout (client-side clears token, but endpoint for completeness)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out' })
})

export default router