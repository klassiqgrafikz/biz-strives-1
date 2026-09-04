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
      `SELECT p.*, COALESCE(c.name, 'Manual') as customer_name
       FROM payments p
       LEFT JOIN customers c ON p.customer_id = c.id
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

// POST /api/payments/income - manual income (payday), no customer
router.post('/income', async (req, res) => {
  try {
    const { amount, note, received_at } = req.body
    const cents = Math.round(parseFloat(amount) * 100)
    if (!cents) {
      return res.status(400).json({ error: 'Amount required' })
    }
    const payment = await queryInsert(
      'INSERT INTO payments (customer_id, source, amount_cents, method, note, received_at) VALUES (NULL, $1, $2, $3, $4, $5) RETURNING *',
      ['manual', cents, 'manual', note || 'Payday income', received_at ? new Date(received_at).toISOString() : new Date().toISOString()]
    )
    res.json({ data: payment })
  } catch (err) {
    console.error('POST /payments/income error:', err)
    res.status(500).json({ error: 'Failed to record income' })
  }
})

// GET /api/payments/:id
router.get('/:id', async (req, res) => {
  try {
    const payment = await queryOne(
      `SELECT p.*, COALESCE(c.name, 'Manual') as customer_name
       FROM payments p
       LEFT JOIN customers c ON p.customer_id = c.id
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
    const { customer_id, amount, method, note, date } = req.body
    const cents = Math.round(parseFloat(amount) * 100)
    if (!customer_id || !cents) {
      return res.status(400).json({ error: 'Customer and amount required' })
    }
    const receivedAt = date ? new Date(date).toISOString() : new Date().toISOString()
    const payment = await queryInsert(
      'INSERT INTO payments (customer_id, source, amount_cents, method, note, received_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [customer_id, 'customer', cents, method || 'bank_transfer', note || null, receivedAt]
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
    const { customer_id, amount, method, note, date } = req.body
    const cents = Math.round(parseFloat(amount) * 100)
    if (!customer_id || !cents) return res.status(400).json({ error: 'Customer and amount required' })

    const receivedAt = date ? new Date(date).toISOString() : undefined
    const payment = receivedAt
      ? await queryOne(
          'UPDATE payments SET customer_id=$1, amount_cents=$2, method=$3, note=$4, received_at=$5 WHERE id=$6 RETURNING *',
          [customer_id, cents, method || 'bank_transfer', note || null, receivedAt, req.params.id]
        )
      : await queryOne(
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