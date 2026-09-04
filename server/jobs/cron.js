import cron from 'node-cron'
import nodemailer from 'nodemailer'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { queryOne, queryAll, queryExec, queryInsert } from '../db/pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BIRTHDAY_HEADER_PATH = path.join(__dirname, '..', 'assets', 'birthday-header.jpg')

function plainToHtml(text) {
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  const paragraphs = text.trim().split(/\n\s*\n/)
  return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
}

function buildBirthdayHtml(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td><img src="cid:birthday-header" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:8px 8px 0 0;" alt="Happy Birthday"></td></tr>
<tr><td style="padding:30px 40px;color:#333333;font-size:15px;line-height:1.7;">
${body}
</td></tr>
<tr><td style="padding:0 40px 30px;"><hr style="border:none;border-top:1px solid #eee;margin:0;"></td></tr>
</table>
</td></tr></table>
</body>
</html>`
}

async function getSettings() {
  return await queryOne('SELECT * FROM settings WHERE id = 1')
}

function isPostAcceptanceError(err) {
  // Gmail sometimes delivers the message but closes the socket in a way that
  // makes nodemailer throw a connection/socket timeout AFTER the mail was
  // accepted for delivery. These are not auth/validation rejections.
  const code = (err && err.code) || ''
  const msg = `${err && (err.response || err.message || '')}`
  const noResponseCode = !err || !err.responseCode
  const isConnErr = /ETIMEDOUT|ESOCKET|ECONNRESET|ECONNECTION|Connection.*(timeout|closed|reset)/i.test(code + ' ' + msg)
  return isConnErr && noResponseCode
}

async function sendEmail(to, subject, html, attachments) {
  const settings = await getSettings()
  if (!settings.gmail_user || !settings.gmail_app_password) {
    console.log('[EMAIL] Not configured - would send to:', to, subject)
    return { skipped: true }
  }

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
  // Retry a couple of times to ride out transient Render->Gmail network stalls.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const mailOptions = {
        from: `"${settings.brand_name}" <${settings.gmail_user}>`,
        to,
        subject,
        html
      }
      if (attachments) mailOptions.attachments = attachments
      await transporter.sendMail(mailOptions)
      return { sent: true }
    } catch (err) {
      lastErr = err
      // If the error is a post-acceptance connection teardown (Gmail already
      // accepted the message for delivery), count it as sent.
      if (isPostAcceptanceError(err)) {
        console.warn(`[EMAIL] Likely delivered but connection teardown error (attempt ${attempt}) to:`, to, '-', err.message)
        return { sent: true, warned: true }
      }
      // Hard failure code paths (auth, bad request, etc.) don't retry.
      if (err.responseCode && err.responseCode >= 400) {
        break
      }
      console.warn(`[EMAIL] Attempt ${attempt} failed to:`, to, '-', err.message)
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }

  console.error('[EMAIL] Send failed to:', to, '-', lastErr && (lastErr.response || lastErr.message))
  return { error: true }
}

function fmtNaira(cents) {
  return '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
  return { start, end }
}

function renderTemplate(template, vars) {
  let html = template.body
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return html
}

async function checkJobRun(jobName, periodKey) {
  const existing = await queryOne(
    'SELECT 1 FROM job_runs WHERE job_name = $1 AND period_key = $2',
    [jobName, periodKey]
  )
  return !!existing
}

async function markJobRun(jobName, periodKey) {
  await queryExec(
    'INSERT INTO job_runs (job_name, period_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [jobName, periodKey]
  )
}

// Birthday job - runs daily at 08:00
export async function runBirthdayJob() {
  console.log('[CRON] Running birthday check...')
  const settings = await getSettings()
  const tz = settings?.timezone || 'Africa/Lagos'

  // Get today's date in the configured timezone
  const today = new Date().toLocaleDateString('en-CA', { timeZone: tz }).split('-').slice(1).join('-') // MM-DD
  const periodKey = new Date().toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD

  // Check if already run today
  if (await checkJobRun('birthday', periodKey)) {
    console.log('[CRON] Birthday job already run for', periodKey)
    return
  }

  const customers = await queryAll(
    `SELECT * FROM customers WHERE active = TRUE AND to_char(birthday, 'MM-DD') = $1`,
    [today]
  )

  if (customers.length === 0) {
    console.log('[CRON] No birthdays today')
    await markJobRun('birthday', periodKey)
    return
  }

  const tpl = await queryOne("SELECT * FROM templates WHERE type = 'birthday' LIMIT 1")
  if (!tpl) {
    console.log('[CRON] No birthday template')
    await markJobRun('birthday', periodKey)
    return
  }

  let birthdayAttachments
  if (fs.existsSync(BIRTHDAY_HEADER_PATH)) {
    birthdayAttachments = [{ filename: 'birthday-header.jpg', path: BIRTHDAY_HEADER_PATH, cid: 'birthday-header' }]
  }

  for (const c of customers) {
    const renderedBody = renderTemplate(tpl, { name: c.name, brand: settings.brand_name })
    const html = buildBirthdayHtml(plainToHtml(renderedBody))
    const result = await sendEmail(c.email, tpl.subject.replace('{name}', c.name), html, birthdayAttachments)
    await queryInsert(
      'INSERT INTO message_log (customer_id, type, status) VALUES ($1, $2, $3)',
      [c.id, 'birthday', result.sent ? 'sent' : result.error ? 'failed' : 'skipped']
    )
    console.log('[CRON] Birthday', result.sent ? 'sent to' : result.error ? 'FAILED for' : 'skipped for', c.email)
  }

  await markJobRun('birthday', periodKey)
}

// Monthly job - runs daily at 21:00, checks if tomorrow is 1st (i.e., today is last day of month)
export async function runMonthlyJob() {
  console.log('[CRON] Running monthly job check...')
  const settings = await getSettings()
  if (!settings.statement_email) {
    console.log('[CRON] No statement email configured')
    return
  }

  const tz = settings.timezone || 'Africa/Lagos'
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowDay = tomorrow.toLocaleDateString('en-CA', { timeZone: tz }).split('-')[2] // DD
  const periodKey = now.toLocaleDateString('en-CA', { timeZone: tz }).slice(0, 7) // YYYY-MM

  // Only run if tomorrow is the 1st (i.e., today is last day of month)
  if (tomorrowDay !== '01') {
    console.log('[CRON] Not last day of month, skipping')
    return
  }

  // Check if already run this month
  if (await checkJobRun('monthly', periodKey)) {
    console.log('[CRON] Monthly job already run for', periodKey)
    return
  }

  console.log('[CRON] Last day of month detected, running monthly job...')

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const { start, end } = getMonthRange(lastMonth)

  const [payments, expenses, savingsEntries] = await Promise.all([
    queryAll(
      `SELECT p.*, COALESCE(c.name, 'Manual') as customer_name
       FROM payments p
       LEFT JOIN customers c ON p.customer_id = c.id
       WHERE p.received_at BETWEEN $1 AND $2 ORDER BY p.received_at`,
      [start.toISOString(), end.toISOString()]
    ),
    queryAll(
      'SELECT * FROM expenses WHERE spent_at BETWEEN $1 AND $2 ORDER BY spent_at',
      [start.toISOString(), end.toISOString()]
    ),
    queryAll(
      'SELECT * FROM savings WHERE saved_at BETWEEN $1 AND $2 ORDER BY saved_at',
      [start.toISOString(), end.toISOString()]
    )
  ])

  const incomeTotal = payments.reduce((s, p) => s + p.amount_cents, 0)
  const expenseTotal = expenses.reduce((s, e) => s + e.amount_cents, 0)
  const savingsTotal = savingsEntries.reduce((s, e) => s + e.amount_cents, 0)
  const net = incomeTotal - expenseTotal - savingsTotal

  // Generate PDF
  const doc = new PDFDocument({ margin: 50 })
  const chunks = []

  await new Promise((resolve, reject) => {
    doc.on('data', c => chunks.push(c))
    doc.on('end', resolve)
    doc.on('error', reject)

    doc.fontSize(24).font('Helvetica-Bold').text(settings?.brand_name || 'BizStrives', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(14).font('Helvetica').text(
      `Monthly Statement - ${lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      { align: 'center' }
    )
    doc.moveDown(1)

    doc.fontSize(12).font('Helvetica-Bold').text('Income Received')
    doc.moveDown(0.3)
    payments.forEach(p => {
      doc.font('Helvetica').text(`${p.received_at.split('T')[0]}  ${p.customer_name}  ${fmtNaira(p.amount_cents)}  ${p.method}  ${p.note || ''}`)
    })
    doc.moveDown(0.5)
    doc.font('Helvetica-Bold').text(`Total Income: ${fmtNaira(incomeTotal)}`)
    doc.moveDown(1)

    doc.fontSize(12).font('Helvetica-Bold').text('Expenses')
    doc.moveDown(0.3)
    expenses.forEach(e => {
      doc.font('Helvetica').text(`${e.spent_at.split('T')[0]}  ${e.category}  ${fmtNaira(e.amount_cents)}  ${e.description || ''}`)
    })
    doc.moveDown(0.5)
    doc.font('Helvetica-Bold').text(`Total Expenses: ${fmtNaira(expenseTotal)}`)
    doc.moveDown(1)

    doc.fontSize(12).font('Helvetica-Bold').text('Savings')
    doc.moveDown(0.3)
    savingsEntries.forEach(s => {
      const prefix = s.amount_cents >= 0 ? '+' : ''
      doc.font('Helvetica').text(`${s.saved_at.split('T')[0]}  ${prefix}${fmtNaira(Math.abs(s.amount_cents))}  ${s.description || ''}`)
    })
    doc.moveDown(0.5)
    doc.font('Helvetica-Bold').text(`Total Savings: ${fmtNaira(savingsTotal)}`)
    doc.moveDown(1)

    doc.fontSize(14).font('Helvetica-Bold').text(`Net Cash Flow: ${fmtNaira(net)}`, { align: 'right' })
    doc.moveDown(1)
    doc.fontSize(10).font('Helvetica-Oblique').text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' })

    doc.end()
  })

  const pdfBuffer = Buffer.concat(chunks)

  // Email statement
  await sendEmail(
    settings.statement_email,
    `Monthly Statement - ${lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
    `<p>Your monthly statement is attached.</p>`
  )
  console.log('[CRON] Statement emailed to', settings.statement_email)

  // Bulk monthly messages
  const tpl = await queryOne("SELECT * FROM templates WHERE type = 'monthly' LIMIT 1")
  if (tpl) {
    const activeCustomers = await queryAll('SELECT * FROM customers WHERE active = TRUE')
    for (const c of activeCustomers) {
      const custPayments = payments.filter(p => p.customer_id === c.id)
      const custTotal = custPayments.reduce((s, p) => s + p.amount_cents, 0)
      const html = renderTemplate(tpl, {
        name: c.name,
        brand: settings.brand_name,
        month: lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
        total_received: fmtNaira(custTotal),
        total_spent: fmtNaira(expenseTotal),
        total_saved: fmtNaira(savingsTotal),
        net_cash: fmtNaira(net)
      })
      const bulkResult = await sendEmail(
        c.email,
        tpl.subject.replace('{brand}', settings.brand_name).replace('{month}', lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' })),
        html
      )
      await queryInsert(
        'INSERT INTO message_log (customer_id, type, status) VALUES ($1, $2, $3)',
        [c.id, 'bulk_message', bulkResult.sent ? 'sent' : bulkResult.error ? 'failed' : 'skipped']
      )
    }
    console.log('[CRON] Bulk messages sent to', activeCustomers.length, 'customers')
  }

  await markJobRun('monthly', periodKey)
}

// Friday savings-reminder job - fires every Friday, emails owner if no savings recorded that week
export async function runSavingsReminderJob() {
  console.log('[CRON] Running savings reminder check...')
  const settings = await getSettings()
  if (!settings.gmail_user || !settings.gmail_app_password || !settings.statement_email) {
    console.log('[CRON] Email not configured - skipping savings reminder')
    return
  }

  const tz = settings.timezone || 'Africa/Lagos'
  const now = new Date()

  // Compute start of the current week (Monday) in the configured timezone.
  // node-cron fires this only on Fridays, so dow is a weekday (Mon-Fri).
  const dow = now.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz }).toLowerCase()
  const dowNum = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 }[dow] || 7

  const weekStartLocal = new Date(
    now.toLocaleDateString('en-CA', { timeZone: tz }) + 'T00:00:00'
  ) // start of today in tz
  weekStartLocal.setDate(weekStartLocal.getDate() - (dowNum - 1)) // back to Monday
  const weekStartISO = new Date(weekStartLocal.toUTCString()).toISOString()

  const periodKey = weekStartISO.split('T')[0]

  if (await checkJobRun('savings_reminder', periodKey)) {
    console.log('[CRON] Savings reminder already run for week', periodKey)
    return
  }

  // Check if any savings entry this week
  const saved = await queryOne(
    'SELECT COALESCE(SUM(amount_cents),0) as total FROM savings WHERE saved_at >= $1',
    [weekStartISO]
  )
  const savedTotal = parseInt(saved.total)

  if (savedTotal > 0) {
    console.log('[CRON] Savings recorded this week, no reminder needed')
    await markJobRun('savings_reminder', periodKey)
    return
  }

  const tpl = await queryOne("SELECT * FROM templates WHERE type = 'savings_reminder' LIMIT 1")

  let html
  let subject
  if (tpl) {
    html = renderTemplate(tpl, { brand: settings.brand_name })
    subject = tpl.subject.replace('{brand}', settings.brand_name)
  } else {
    html = `<p>You haven't recorded any savings this week.</p><p>Take a moment to log your weekly savings so your records stay up to date.</p>`
    subject = `Savings Reminder - ${new Date().toLocaleDateString('default', { month: 'long', day: 'numeric' })}`
  }

  const result = await sendEmail(settings.statement_email, subject, html)
  await queryInsert(
    'INSERT INTO message_log (customer_id, type, status) VALUES ($1, $2, $3)',
    [null, 'savings_reminder', result.sent ? 'sent' : result.error ? 'failed' : 'skipped']
  )
  console.log('[CRON] Savings reminder', result.sent ? 'emailed to' : result.error ? 'FAILED for' : 'skipped for', settings.statement_email)

  await markJobRun('savings_reminder', periodKey)
}

export function scheduleJobs() {
  const tz = process.env.TZ || 'Africa/Lagos'

  // Birthday: daily at 08:00
  cron.schedule('0 8 * * *', runBirthdayJob, { timezone: tz })

  // Monthly check: daily at 21:00, will only run on last day of month
  cron.schedule('0 21 * * *', runMonthlyJob, { timezone: tz })

  // Savings reminder: every Friday at 18:00
  cron.schedule('0 18 * * 5', runSavingsReminderJob, { timezone: tz })

  console.log('[CRON] Jobs scheduled: birthdays 08:00, monthly check 21:00, savings reminder Fri 18:00 (', tz, ')')
}

// Catch-up on startup
export async function runCatchUp() {
  console.log('[STARTUP] Checking for missed jobs...')
  await runBirthdayJob()
  await runMonthlyJob()
}