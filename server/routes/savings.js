import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryInsert, queryAll, queryExec } from '../db/pool.js'

const router = Router()

router.use(requireAuth)

// GET /api/savings
router.get('/', async (req, res) => {
  try {
    const entries = await queryAll('SELECT * FROM savings ORDER BY saved_at DESC')
    res.json({ data: entries })
  } catch (err) {
    console.error('GET /savings error:', err)
    res.status(500).json({ error: 'Failed to fetch savings' })
  }
})

// GET /api/savings/balance
router.get('/balance', async (req, res) => {
  try {
    const row = await queryOne('SELECT COALESCE(SUM(amount_cents), 0) as balance FROM savings')
    res.json({ balance: parseInt(row.balance) })
  } catch (err) {
    console.error('GET /savings/balance error:', err)
    res.status(500).json({ error: 'Failed to fetch balance' })
  }
})

// POST /api/savings/deposit
router.post('/deposit', async (req, res) => {
  try {
    const { amount, description, date } = req.body
    const cents = Math.round(parseFloat(amount) * 100)
    if (!cents) return res.status(400).json({ error: 'Amount required' })

    const savedAt = date ? new Date(date).toISOString() : new Date().toISOString()
    const entry = await queryInsert(
      'INSERT INTO savings (amount_cents, description, saved_at) VALUES ($1, $2, $3) RETURNING *',
      [cents, description || 'Deposit', savedAt]
    )
    res.json({ data: entry })
  } catch (err) {
    console.error('POST /savings/deposit error:', err)
    res.status(500).json({ error: 'Failed to add deposit' })
  }
})

// POST /api/savings/withdraw
router.post('/withdraw', async (req, res) => {
  try {
    const { amount, description, date } = req.body
    const cents = Math.round(parseFloat(amount) * 100)
    if (!cents) return res.status(400).json({ error: 'Amount required' })

    // Check balance
    const balanceRow = await queryOne('SELECT COALESCE(SUM(amount_cents), 0) as balance FROM savings')
    const balance = parseInt(balanceRow.balance)
    if (cents > balance) return res.status(400).json({ error: 'Insufficient savings balance' })

    const savedAt = date ? new Date(date).toISOString() : new Date().toISOString()
    const entry = await queryInsert(
      'INSERT INTO savings (amount_cents, description, saved_at) VALUES ($1, $2, $3) RETURNING *',
      [-cents, description || 'Withdrawal', savedAt]
    )
    res.json({ data: entry })
  } catch (err) {
    console.error('POST /savings/withdraw error:', err)
    res.status(500).json({ error: 'Failed to withdraw' })
  }
})

// DELETE /api/savings/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await queryExec('DELETE FROM savings WHERE id = $1', [req.params.id])
    if (result === 0) return res.status(404).json({ error: 'Savings entry not found' })
    res.json({ message: 'Savings entry deleted' })
  } catch (err) {
    console.error('DELETE /savings/:id error:', err)
    res.status(500).json({ error: 'Failed to delete savings entry' })
  }
})

export default router