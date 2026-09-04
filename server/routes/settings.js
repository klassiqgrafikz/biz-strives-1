import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryExec } from '../db/pool.js'
import { sendEmail } from '../lib/email.js'
import { getAuthUrl, exchangeCodeForToken } from '../lib/gmailApi.js'

const router = Router()

// PUBLIC: Google OAuth callback (the browser tab lands here after consent).
// Must be registered BEFORE requireAuth so it works without a JWT.
router.get('/oauth/callback', async (req, res) => {
  const { code, error } = req.query
  if (error) {
    return res.status(400).send(`<html><body style="font-family:sans-serif;background:#0a0a0f;color:#fff;text-align:center;padding-top:60px;"><h1 style="color:#ff2d78;">Authorization failed</h1><p>${error}</p><p>Return to the app and try again.</p></body></html>`)
  }
  if (!code) {
    return res.status(400).send('<html><body>Missing authorization code.</body></html>')
  }
  try {
    const settings = await queryOne('SELECT * FROM settings WHERE id = 1')
    if (!settings || !settings.gmail_client_id || !settings.gmail_client_secret) {
      return res.status(400).send('<html><body>OAuth client details not set up yet. Save them in the app first, then try again.</body></html>')
    }
    const redirectUri = `${req.protocol}://${req.get('host')}/api/settings/oauth/callback`
    const tokens = await exchangeCodeForToken({
      clientId: settings.gmail_client_id,
      clientSecret: settings.gmail_client_secret,
      code,
      redirectUri
    })
    await queryExec('UPDATE settings SET gmail_refresh_token = $1 WHERE id = 1', [tokens.refresh_token])
    console.log('[OAUTH] Refresh token stored for', settings.gmail_user)
    res.send(`<html><body style="font-family:sans-serif;background:#0a0a0f;color:#c6ff2e;text-align:center;padding-top:60px;"><h1>✓ Connected!</h1><p style="color:#fff;">Gmail API is connected. You can close this tab and return to the app.</p></body></html>`)
  } catch (err) {
    console.error('[OAUTH] Callback error:', err)
    res.status(500).send(`<html><body style="font-family:sans-serif;background:#0a0a0f;color:#ff2d78;text-align:center;padding-top:60px;"><h1>Connection failed</h1><p>${err.message}</p></body></html>`)
  }
})

router.use(requireAuth)

// GET /api/settings/oauth/url - build the Google consent URL for this app's host
router.get('/oauth/url', async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM settings WHERE id = 1')
    if (!settings || !settings.gmail_client_id || !settings.gmail_client_secret) {
      return res.status(400).json({ error: 'Save your Google OAuth Client ID and Client Secret first' })
    }
    const redirectUri = `${req.protocol}://${req.get('host')}/api/settings/oauth/callback`
    const url = getAuthUrl({ clientId: settings.gmail_client_id, redirectUri })
    res.json({ url, redirectUri })
  } catch (err) {
    console.error('GET /settings/oauth/url error:', err)
    res.status(500).json({ error: 'Failed to build Google connection URL' })
  }
})

// GET /api/settings/gmail-status - is the Gmail API connected?
router.get('/gmail-status', async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM settings WHERE id = 1')
    res.json({
      connected: !!(settings && settings.gmail_client_id && settings.gmail_client_secret && settings.gmail_refresh_token),
      gmail_user: (settings && settings.gmail_user) || null
    })
  } catch (err) {
    console.error('GET /settings/gmail-status error:', err)
    res.status(500).json({ error: 'Failed to check Gmail connection' })
  }
})

// POST /api/settings/test-email - send a test email using saved Gmail credentials
router.post('/test-email', async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM settings WHERE id = 1')
    if (!settings.gmail_user) {
      return res.status(400).json({ error: 'Gmail details not configured yet' })
    }
    const to = req.body.to || settings.statement_email || settings.gmail_user
    if (!to) return res.status(400).json({ error: 'No recipient email available' })

    const result = await sendEmail(to, `Test Email from ${settings.brand_name}`,
      `<p>This is a test email from <strong>${settings.brand_name}</strong>.</p><p>If you received this, your Gmail settings are working correctly.</p>`)

    if (result.sent) {
      res.json({ message: 'Test email sent successfully' })
    } else {
      res.status(400).json({ error: `Email send failed: ${result.message || 'Check server logs'}` })
    }
  } catch (err) {
    console.error('POST /settings/test-email error:', err)
    res.status(500).json({ error: 'Failed to send test email' })
  }
})

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const settings = await queryOne('SELECT * FROM settings WHERE id = 1')
    const { gmail_app_password, gmail_client_secret, gmail_refresh_token, ...safe } = settings
    safe.gmail_api_connected = !!(settings.gmail_client_id && settings.gmail_client_secret && settings.gmail_refresh_token)
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
      gmail_app_password,
      gmail_client_id,
      gmail_client_secret
    } = req.body

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

    if (gmail_client_id && gmail_client_id.trim() !== '') {
      query += `, gmail_client_id = $${params.length + 1}`
      params.push(gmail_client_id.trim())
    }

    if (gmail_client_secret && gmail_client_secret.trim() !== '') {
      query += `, gmail_client_secret = $${params.length + 1}`
      params.push(gmail_client_secret.trim())
    }

    query += ' WHERE id = 1 RETURNING *'

    const saved = await queryOne(query, params)
    const { gmail_app_password: _, gmail_client_secret: __, gmail_refresh_token: ___, ...safe } = saved
    safe.gmail_api_connected = !!(saved.gmail_client_id && saved.gmail_client_secret && saved.gmail_refresh_token)
    res.json({ data: safe })
  } catch (err) {
    console.error('PUT /settings error:', err)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

export default router