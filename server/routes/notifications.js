import { Router } from 'express'
import nodemailer from 'nodemailer'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryAll, queryInsert } from '../db/pool.js'

const router = Router()

router.use(requireAuth)

const isPostAcceptanceError = (err) => {
  const code = (err && err.code) || ''
  const msg = `${err && (err.response || err.message || '')}`
  const noResponseCode = !err || !err.responseCode
  const isConnErr = /ETIMEDOUT|ESOCKET|ECONNRESET|ECONNECTION|Connection.*(timeout|closed|reset)/i.test(code + ' ' + msg)
  return isConnErr && noResponseCode
}

async function sendEmailOne(settings, to, subject, html) {
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

  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await transporter.sendMail({
        from: `"${settings.brand_name}" <${settings.gmail_user}>`,
        to,
        subject,
        html
      })
      return { status: 'sent' }
    } catch (err) {
      lastErr = err
      if (isPostAcceptanceError(err)) {
        return { status: 'sent' }
      }
      if (err.responseCode && err.responseCode >= 400) break
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
  console.error('[NOTIFY] Send failed to:', to, '-', lastErr && (lastErr.response || lastErr.message))
  return { status: 'failed' }
}

// GET /api/notifications/recipients - list all customers with emails
router.get('/recipients', async (req, res) => {
  try {
    const customers = await queryAll(
      `SELECT id, name, email, active FROM customers WHERE email IS NOT NULL AND email <> '' ORDER BY name`
    )
    res.json({ data: customers })
  } catch (err) {
    console.error('GET /notifications/recipients error:', err)
    res.status(500).json({ error: 'Failed to fetch recipients' })
  }
})

// POST /api/notifications/broadcast - send an HTML email to all customers
router.post('/broadcast', async (req, res) => {
  try {
    const { subject, html, recipientIds } = req.body
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' })
    }
    if (!html || !html.trim()) {
      return res.status(400).json({ error: 'Message body is required' })
    }

    const settings = await queryOne('SELECT * FROM settings WHERE id = 1')
    if (!settings.gmail_user || !settings.gmail_app_password) {
      return res.status(400).json({ error: 'Gmail details not configured yet' })
    }

    let customers
    if (recipientIds && recipientIds.length > 0) {
      const placeholders = recipientIds.map((_, i) => `$${i + 1}`).join(',')
      customers = await queryAll(
        `SELECT id, name, email FROM customers WHERE id IN (${placeholders}) AND email IS NOT NULL AND email <> ''`,
        recipientIds
      )
    } else {
      customers = await queryAll(
        `SELECT id, name, email FROM customers WHERE active = TRUE AND email IS NOT NULL AND email <> ''`
      )
    }
    if (customers.length === 0) {
      return res.status(400).json({ error: 'No customers with valid emails to notify' })
    }

    const results = { sent: 0, failed: 0 }
    const failures = []

    for (const c of customers) {
      const result = await sendEmailOne(settings, c.email, subject, html)
      if (result.status === 'sent') {
        results.sent++
        await queryInsert(
          'INSERT INTO message_log (customer_id, type, status) VALUES ($1, $2, $3)',
          [c.id, 'notification', 'sent']
        )
      } else {
        results.failed++
        failures.push({ name: c.name, email: c.email })
      }
    }

    res.json({
      message: `Broadcast complete`,
      results,
      failures
    })
  } catch (err) {
    console.error('POST /notifications/broadcast error:', err)
    res.status(500).json({ error: 'Failed to send notifications' })
  }
})

export default router
