import { Router } from 'express'

const router = Router()

// GET /api/health
router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router