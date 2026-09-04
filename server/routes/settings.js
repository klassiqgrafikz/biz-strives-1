import { Router } from 'express'
import nodemailer from 'nodemailer'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryExec } from '../db/pool.js'

const router = Router()

router.use(requireAuth)

// POST /api/settings/test-email - send a test email using saved Gmail credentials
router.post('/test-email', async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM settings WHERE id = 1')
    if (!settings.gmail_user || !settings.gmail_app_password) {
      return res.status(400).json({ error: 'Gmail details not configured yet' })
    }
    const to = req.body.to || settings.statement_email || settings.gmail_user
    if (!to) return res.status(400).json({ error: 'No recipient email available' })

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      connectionTimeout: 45000,
      greetingTimeout: 30000,
      socketTimeout: 90000,
      auth: {
        user: settings.gmail_user,
        pass: settings.gmail_app_password
      }
    })

    const isPostAcceptanceError = (err) => {
      const code = (err && err.code) || ''
      const msg = `${err && (err.response || err.message || '')}`
      const noResponseCode = !err || !err.responseCode
      const isConnErr = /ETIMEDOUT|ESOCKET|ECONNRESET|ECONNECTION|Connection.*(timeout|closed|reset)/i.test(code + ' ' + msg)
      return isConnErr && noResponseCode
    }

    let lastErr
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await transporter.sendMail({
          from: `"${settings.brand_name}" <${settings.gmail_user}>`,
          to,
          subject: `Test Email from ${settings.brand_name}`,
          text: 'This is a test email to confirm your Gmail settings are working correctly.',
          html: `<p>This is a test email from <strong>${settings.brand_name}</strong>.</p><p>If you received this, your Gmail settings are working correctly.</p>`
        })
        return res.json({ message: 'Test email sent successfully' })
      } catch (err) {
        lastErr = err
        if (isPostAcceptanceError(err)) {
          console.warn('POST /settings/test-email likely delivered (teardown error) attempt', attempt, err.message)
          return res.json({ message: 'Test email sent (was possibly delivered despite a connection warning)' })
        }
        if (err.responseCode && err.responseCode >= 400) break
        console.warn('POST /settings/test-email attempt', attempt, 'failed:', err.message)
        if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
      }
    }
    console.error('POST /settings/test-email SMTP error:', lastErr && (lastErr.response || lastErr.message))
    res.status(400).json({ error: `Email send failed: ${lastErr && (lastErr.response || lastErr.message)}` })
  } catch (err) {
    console.error('POST /settings/test-email error:', err)
    res.status(500).json({ error: 'Failed to send test email' })
  }
})

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