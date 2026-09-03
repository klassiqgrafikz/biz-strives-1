import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryInsert, queryAll, queryExec } from '../db/pool.js'

const router = Router()

router.use(requireAuth)

// GET /api/payments
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const payments = await queryAll(
      `SELECT p.*, c.name as customer_name
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       ORDER BY p.received_at DESC
       LIMIT $1`,
      [limit]
    )
    res.json({ data: payments })
  } catch (err) {
    console.error('GET /payments error:', err)
    res.status(500).json({ error: 'Failed to fetch payments' })
  }
})

// GET /api/payments/:id
router.get('/:id', async (req, res) => {
  try {
    const payment = await queryOne(
      `SELECT p.*, c.name as customer_name
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    )
    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    res.json({ data: payment })
  } catch (err) {
    console.error('GET /payments/:id error:', err)
    res.status(500).json({ error: 'Failed to fetch payment' })
  }
})

// POST /api/payments
router.post('/', async (req, res) => {
  try {
    const { customer_id, amount, method, note } = req.body
    const cents = Math.round(parseFloat(amount) * 100)
    if (!customer_id || !cents) {
      return res.status(400).json({ error: 'Customer and amount required' })
    }
    const payment = await queryInsert(
      'INSERT INTO payments (customer_id, amount_cents, method, note) VALUES ($1, $2, $3, $4) RETURNING *',
      [customer_id, cents, method || 'bank_transfer', note || null]
    )
    res.json({ data: payment })
  } catch (err) {
    console.error('POST /payments error:', err)
    res.status(500).json({ error: 'Failed to create payment' })
  }
})

// PUT /api/payments/:id
router.put('/:id', async (req, res) => {
  try {
    const { customer_id, amount, method, note } = req.body
    const cents = Math.round(parseFloat(amount) * 100)
    if (!customer_id || !cents) return res.status(400).json({ error: 'Customer and amount required' })

    const payment = await queryOne(
      'UPDATE payments SET customer_id=$1, amount_cents=$2, method=$3, note=$4 WHERE id=$5 RETURNING *',
      [customer_id, cents, method || 'bank_transfer', note || null, req.params.id]
    )
    if (!payment) return res.status(404).json({ error: 'Payment not found' })
    res.json({ data: payment })
  } catch (err) {
    console.error('PUT /payments/:id error:', err)
    res.status(500).json({ error: 'Failed to update payment' })
  }
})

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await queryExec('DELETE FROM payments WHERE id = $1', [req.params.id])
    if (result === 0) return res.status(404).json({ error: 'Payment not found' })
    res.json({ message: 'Payment deleted' })
  } catch (err) {
    console.error('DELETE /payments/:id error:', err)
    res.status(500).json({ error: 'Failed to delete payment' })
  }
})

export default router