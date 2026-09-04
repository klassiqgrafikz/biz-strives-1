import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryAll, queryInsert } from '../db/pool.js'
import { sendEmail } from '../lib/email.js'

const router = Router()

router.use(requireAuth)

function cleanContentEditableHtml(dirty) {
  let clean = dirty
  clean = clean.replace(/<font[^>]*>/gi, '')
  clean = clean.replace(/<\/font>/gi, '')
  clean = clean.replace(/<div[^>]*>/gi, '<p>')
  clean = clean.replace(/<\/div>/gi, '</p>')
  clean = clean.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
  clean = clean.replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '')
  clean = clean.replace(/\s*style="[^"]*"/gi, '')
  clean = clean.replace(/\s*class="[^"]*"/gi, '')
  clean = clean.replace(/<p><\/p>/gi, '')
  clean = clean.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
  return clean.trim()
}

function buildNotificationHtml(body, brandName) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background-color:#ff2d78;padding:20px 30px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${brandName}</h1>
</td></tr>
<tr><td style="padding:30px 40px;color:#333333;font-size:15px;line-height:1.7;">
${body}
</td></tr>
<tr><td style="padding:0 40px 30px;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>
<tr><td style="padding:0 40px 20px;text-align:center;">
<p style="margin:0;font-size:12px;color:#999999;">This message was sent by ${brandName}</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`
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

    const cleaned = cleanContentEditableHtml(html)
    const wrappedHtml = buildNotificationHtml(cleaned, settings.brand_name)

    const results = { sent: 0, failed: 0 }
    const failures = []

    for (const c of customers) {
      const result = await sendEmail(c.email, subject, wrappedHtml)
      if (result.sent) {
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
