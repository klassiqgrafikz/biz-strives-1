import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryInsert, queryAll, queryExec } from '../db/pool.js'

const router = Router()

router.use(requireAuth)

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const customers = await queryAll('SELECT * FROM customers ORDER BY created_at DESC')
    res.json({ data: customers })
  } catch (err) {
    console.error('GET /customers error:', err)
    res.status(500).json({ error: 'Failed to fetch customers' })
  }
})

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, birthday, active } = req.body
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required' })
    }
    const customer = await queryInsert(
      'INSERT INTO customers (name, email, phone, birthday, active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, phone || null, birthday || null, active ? true : false]
    )
    res.json({ data: customer })
  } catch (err) {
    console.error('POST /customers error:', err)
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' })
    res.status(500).json({ error: 'Failed to create customer' })
  }
})

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, birthday, active } = req.body
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' })

    const customer = await queryOne(
      `UPDATE customers SET name=$1, email=$2, phone=$3, birthday=$4, active=$5
       WHERE id=$6 RETURNING *`,
      [name, email, phone || null, birthday || null, active ? true : false, req.params.id]
    )
    if (!customer) return res.status(404).json({ error: 'Customer not found' })
    res.json({ data: customer })
  } catch (err) {
    console.error('PUT /customers/:id error:', err)
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' })
    res.status(500).json({ error: 'Failed to update customer' })
  }
})

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await queryExec('DELETE FROM customers WHERE id = $1', [req.params.id])
    if (result === 0) return res.status(404).json({ error: 'Customer not found' })
    res.json({ message: 'Customer deleted' })
  } catch (err) {
    console.error('DELETE /customers/:id error:', err)
    res.status(500).json({ error: 'Failed to delete customer' })
  }
})

export default router