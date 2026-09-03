import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryExec } from '../db/pool.js'

const router = Router()

router.use(requireAuth)

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM settings WHERE id = 1')
    // Don't send the password in response
    const { gmail_app_password, ...safe } = settings
    res.json({ data: safe })
  } catch (err) {
    console.error('GET /settings error:', err)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const {
      business_name,
      brand_name,
      tagline,
      statement_email,
      timezone,
      statement_day,
      statement_time,
      gmail_user,
      gmail_app_password
    } = req.body

    // Only update gmail_app_password if provided (not empty string)
    let query = `
      UPDATE settings SET
        business_name = $1,
        brand_name = $2,
        tagline = $3,
        statement_email = $4,
        timezone = $5,
        statement_day = $6,
        statement_time = $7,
        gmail_user = $8,
        updated_at = NOW()
    `
    const params = [
      business_name,
      brand_name,
      tagline,
      statement_email,
      timezone,
      parseInt(statement_day) || 0,
      statement_time || '21:00',
      gmail_user
    ]

    if (gmail_app_password && gmail_app_password.trim() !== '') {
      query += ', gmail_app_password = $9'
      params.push(gmail_app_password)
    }

    query += ' WHERE id = 1 RETURNING *'

    const settings = await queryOne(query, params)
    const { gmail_app_password: _, ...safe } = settings
    res.json({ data: safe })
  } catch (err) {
    console.error('PUT /settings error:', err)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

export default router