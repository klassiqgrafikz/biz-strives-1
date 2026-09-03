import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryInsert, queryAll, queryExec } from '../db/pool.js'

const router = Router()

router.use(requireAuth)

// GET /api/templates
router.get('/', async (req, res) => {
  try {
    const templates = await queryAll('SELECT * FROM templates ORDER BY name')
    res.json({ data: templates })
  } catch (err) {
    console.error('GET /templates error:', err)
    res.status(500).json({ error: 'Failed to fetch templates' })
  }
})

// POST /api/templates
router.post('/', async (req, res) => {
  try {
    const { name, subject, body, type } = req.body
    if (!name || !subject || !body || !type) {
      return res.status(400).json({ error: 'All fields required' })
    }
    const template = await queryInsert(
      'INSERT INTO templates (name, subject, body, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, subject, body, type]
    )
    res.json({ data: template })
  } catch (err) {
    console.error('POST /templates error:', err)
    if (err.code === '23505') return res.status(409).json({ error: 'Template name already exists' })
    res.status(500).json({ error: 'Failed to create template' })
  }
})

// PUT /api/templates/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, subject, body, type } = req.body
    if (!name || !subject || !body || !type) {
      return res.status(400).json({ error: 'All fields required' })
    }
    const template = await queryOne(
      'UPDATE templates SET name=$1, subject=$2, body=$3, type=$4 WHERE id=$5 RETURNING *',
      [name, subject, body, type, req.params.id]
    )
    if (!template) return res.status(404).json({ error: 'Template not found' })
    res.json({ data: template })
  } catch (err) {
    console.error('PUT /templates/:id error:', err)
    if (err.code === '23505') return res.status(409).json({ error: 'Template name already exists' })
    res.status(500).json({ error: 'Failed to update template' })
  }
})

// DELETE /api/templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await queryExec('DELETE FROM templates WHERE id = $1', [req.params.id])
    if (result === 0) return res.status(404).json({ error: 'Template not found' })
    res.json({ message: 'Template deleted' })
  } catch (err) {
    console.error('DELETE /templates/:id error:', err)
    res.status(500).json({ error: 'Failed to delete template' })
  }
})

export default router