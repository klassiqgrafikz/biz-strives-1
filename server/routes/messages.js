import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryAll, queryExec } from '../db/pool.js'

const router = Router()

router.use(requireAuth)

// GET /api/messages/log
router.get('/log', async (req, res) => {
  try {
    const log = await queryAll(
      `SELECT ml.*, c.name as customer_name
       FROM message_log ml
       LEFT JOIN customers c ON ml.customer_id = c.id
       ORDER BY ml.sent_at DESC
       LIMIT 50`
    )
    res.json({ data: log })
  } catch (err) {
    console.error('GET /messages/log error:', err)
    res.status(500).json({ error: 'Failed to fetch message log' })
  }
})

// DELETE /api/messages/log
router.delete('/log', async (req, res) => {
  try {
    await queryExec('DELETE FROM message_log')
    res.json({ message: 'All messages cleared' })
  } catch (err) {
    console.error('DELETE /messages/log error:', err)
    res.status(500).json({ error: 'Failed to clear messages' })
  }
})

export default router