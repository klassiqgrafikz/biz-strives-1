import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryInsert, queryAll, queryExec } from '../db/pool.js'

const router = Router()

router.use(requireAuth)

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const expenses = await queryAll(
      'SELECT * FROM expenses ORDER BY spent_at DESC LIMIT $1',
      [limit]
    )
    res.json({ data: expenses })
  } catch (err) {
    console.error('GET /expenses error:', err)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { category, amount, description, date } = req.body
    const cents = Math.round(parseFloat(amount) * 100)
    if (!category || !cents) {
      return res.status(400).json({ error: 'Category and amount required' })
    }
    const spentAt = date ? new Date(date).toISOString() : new Date().toISOString()
    const expense = await queryInsert(
      'INSERT INTO expenses (category, amount_cents, description, spent_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [category, cents, description || null, spentAt]
    )
    res.json({ data: expense })
  } catch (err) {
    console.error('POST /expenses error:', err)
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const { category, amount, description, date } = req.body
    const cents = Math.round(parseFloat(amount) * 100)
    if (!category || !cents) return res.status(400).json({ error: 'Category and amount required' })

    const spentAt = date ? new Date(date).toISOString() : undefined
    const expense = spentAt
      ? await queryOne(
          'UPDATE expenses SET category=$1, amount_cents=$2, description=$3, spent_at=$4 WHERE id=$5 RETURNING *',
          [category, cents, description || null, spentAt, req.params.id]
        )
      : await queryOne(
          'UPDATE expenses SET category=$1, amount_cents=$2, description=$3 WHERE id=$4 RETURNING *',
          [category, cents, description || null, req.params.id]
        )
    if (!expense) return res.status(404).json({ error: 'Expense not found' })
    res.json({ data: expense })
  } catch (err) {
    console.error('PUT /expenses/:id error:', err)
    res.status(500).json({ error: 'Failed to update expense' })
  }
})

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await queryExec('DELETE FROM expenses WHERE id = $1', [req.params.id])
    if (result === 0) return res.status(404).json({ error: 'Expense not found' })
    res.json({ message: 'Expense deleted' })
  } catch (err) {
    console.error('DELETE /expenses/:id error:', err)
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

export default router