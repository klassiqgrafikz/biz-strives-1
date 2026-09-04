import cron from 'node-cron'
import nodemailer from 'nodemailer'
import PDFDocument from 'pdfkit'
import { queryOne, queryAll, queryExec, queryInsert } from '../db/pool.js'

async function getSettings() {
  return await queryOne('SELECT * FROM settings WHERE id = 1')
}

async function sendEmail(to, subject, html) {
  const settings = await getSettings()
  if (!settings.gmail_user || !settings.gmail_app_password) {
    console.log('[EMAIL] Not configured - would send to:', to, subject)
    return { skipped: true }
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: settings.gmail_user,
      pass: settings.gmail_app_password
    }
  })

  try {
    await transporter.sendMail({
      from: `"${settings.brand_name}" <${settings.gmail_user}>`,
      to,
      subject,
      html
    })
    return { sent: true }
  } catch (err) {
    console.error('[EMAIL] Send failed to:', to, '-', err.response || err.message)
    return { error: true }
  }
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

  for (const c of customers) {
    const html = renderTemplate(tpl, { name: c.name, brand: settings.brand_name })
    const result = await sendEmail(c.email, tpl.subject.replace('{brand}', settings.brand_name).replace('{name}', c.name), html)
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