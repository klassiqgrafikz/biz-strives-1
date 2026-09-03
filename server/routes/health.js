import { Router } from 'express'
import { queryOne } from '../db/pool.js'

const router = Router()

// GET /api/health — also reports DB status for diagnostics
router.get('/', async (req, res) => {
  try {
    await queryOne('SELECT 1')
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'degraded', db: 'error', error: err.message, timestamp: new Date().toISOString() })
  }
})

export default router