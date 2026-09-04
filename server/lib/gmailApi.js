import nodemailer from 'nodemailer'

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send'

export function getAuthUrl({ clientId, redirectUri }) {
  const qs = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SEND_SCOPE,
    access_type: 'offline',
    prompt: 'consent'
  })
  return `${OAUTH_AUTH_URL}?${qs.toString()}`
}

export async function exchangeCodeForToken({ clientId, clientSecret, code, redirectUri }) {
  const r = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error_description || data.error || 'Token exchange failed')
  if (!data.refresh_token) {
    throw new Error('No refresh_token returned. Consent was not stored — sign out of Google in that browser and try again.')
  }
  return data
}

async function getAccessToken({ clientId, clientSecret, refreshToken }) {
  const r = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error_description || data.error || 'Token refresh failed')
  return data.access_token
}

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Build the full RFC822 MIME message locally (no SMTP connection needed)
async function buildRawMessage({ to, subject, html, attachments, settings }) {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true })
  const mailOptions = {
    from: `"${settings.brand_name}" <${settings.gmail_user}>`,
    to,
    subject,
    html
  }
  if (attachments) mailOptions.attachments = attachments

  const info = await transport.sendMail(mailOptions)
  if (Buffer.isBuffer(info.message)) return info.message
  const chunks = []
  for await (const chunk of info.message) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export async function sendViaApi({ to, subject, html, attachments, settings }) {
  const raw = base64url(await buildRawMessage({ to, subject, html, attachments, settings }))

  const post = async (token) => {
    return fetch(GMAIL_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    })
  }

  const creds = {
    clientId: settings.gmail_client_id,
    clientSecret: settings.gmail_client_secret,
    refreshToken: settings.gmail_refresh_token
  }

  let token = await getAccessToken(creds)
  let r = await post(token)
  if (r.status === 401) {
    token = await getAccessToken(creds)
    r = await post(token)
  }

  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error?.message || `Gmail API returned ${r.status}`)

  console.log(`[EMAIL] Sent via Gmail API (${data.id}) → ${to}`)
  return { sent: true }
}