import nodemailer from 'nodemailer'
import { queryOne } from '../db/pool.js'

function isConnectionError(err) {
  if (!err) return false
  const code = err.code || ''
  const msg = `${err.response || err.message || ''}`
  const noResponseCode = !err.responseCode
  const isConn = /ETIMEDOUT|ESOCKET|ECONNRESET|ECONNECTION|ECONNREFUSED|Connection.*(timeout|closed|reset)|Greeting never received/i.test(code + ' ' + msg)
  return isConn && noResponseCode
}

async function getSettings() {
  return await queryOne('SELECT * FROM settings WHERE id = 1')
}

export async function sendEmail(to, subject, html, attachments) {
  const settings = await getSettings()
  if (!settings || !settings.gmail_user || !settings.gmail_app_password) {
    console.log('[EMAIL] Not configured - would send to:', to, subject)
    return { sent: false, skipped: true }
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    connectionTimeout: 45000,
    greetingTimeout: 30000,
    socketTimeout: 90000,
    auth: {
      user: settings.gmail_user,
      pass: settings.gmail_app_password
    }
  })

  const mailOptions = {
    from: `"${settings.brand_name}" <${settings.gmail_user}>`,
    to,
    subject,
    html
  }
  if (attachments) mailOptions.attachments = attachments

  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions)
      console.log(`[EMAIL] Accepted (${info.messageId}) → ${to}`)
      return { sent: true }
    } catch (err) {
      lastErr = err
      // Hard failure — SMTP rejected (auth, invalid address, etc.)
      if (err.responseCode && err.responseCode >= 400) {
        console.error(`[EMAIL] Hard failure ${err.responseCode} → ${to}:`, err.response || err.message)
        break
      }
      // Connection error — retry (may be transient or pre-delivery timeout)
      if (isConnectionError(err)) {
        console.warn(`[EMAIL] Connection error (attempt ${attempt}/3) → ${to}:`, err.code || err.message)
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt))
        continue
      }
      // Unknown error — retry
      console.warn(`[EMAIL] Unknown error (attempt ${attempt}/3) → ${to}:`, err.message)
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }

  console.error(`[EMAIL] FAILED → ${to} —`, lastErr && (lastErr.response || lastErr.message))
  return { sent: false, error: true, message: lastErr && (lastErr.response || lastErr.message) }
}
