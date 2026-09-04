import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import authRoutes from './routes/auth.js'
import customerRoutes from './routes/customers.js'
import paymentRoutes from './routes/payments.js'
import expenseRoutes from './routes/expenses.js'
import savingsRoutes from './routes/savings.js'
import dashboardRoutes from './routes/dashboard.js'
import reportRoutes from './routes/reports.js'
import templateRoutes from './routes/templates.js'
import settingsRoutes from './routes/settings.js'
import messageRoutes from './routes/messages.js'
import notificationRoutes from './routes/notifications.js'
import adminRoutes from './routes/admin.js'
import healthRoutes from './routes/health.js'
import { runCatchUp, scheduleJobs } from './jobs/cron.js'
import { queryAll, queryInsert, queryExec } from './db/pool.js'
import { DEFAULT_TEMPLATES, DEFAULT_BRAND_NAME } from './lib/defaultTemplates.js'

const PREV_DEFAULTS = {
  birthday: {
    subject: 'Happy Birthday, {name}! | {brand}',
    body: `Dear {name},\n\nOn behalf of everyone at {brand}, we extend our warmest wishes to you on your special day.\n\nYour continued trust and support mean a great deal to us. We hope this new year brings you abundant joy, good health, and continued success in all your endeavours.\n\nWishing you a most wonderful birthday.\n\nWith sincere regards,\nThe {brand} Team`
  }
}

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Mount each router under both /api/* and /* (aliases)
const routes = [
  ['/api/health', healthRoutes],
  ['/api/auth', authRoutes],
  ['/api/dashboard', dashboardRoutes],
  ['/api/customers', customerRoutes],
  ['/api/payments', paymentRoutes],
  ['/api/expenses', expenseRoutes],
  ['/api/savings', savingsRoutes],
  ['/api/reports', reportRoutes],
  ['/api/templates', templateRoutes],
  ['/api/settings', settingsRoutes],
  ['/api/messages', messageRoutes],
  ['/api/notifications', notificationRoutes],
  ['/api/admin', adminRoutes]
]

for (const [path, router] of routes) {
  app.use(path, router)
}

// Alias the same routers at the root (no /api prefix) to match client API paths
for (const [path, router] of routes) {
  app.use(path.replace('/api', ''), router)
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

async function seedDefaults() {
  try {
    for (const tpl of DEFAULT_TEMPLATES) {
      const existing = await queryAll('SELECT id, body FROM templates WHERE type = $1 LIMIT 1', [tpl.type])
      if (existing.length === 0) {
        await queryInsert(
          'INSERT INTO templates (name, subject, body, type) VALUES ($1, $2, $3, $4)',
          [tpl.name, tpl.subject, tpl.body, tpl.type]
        )
        console.log(`[SEED] Inserted default template: ${tpl.type}`)
      } else {
        const prev = PREV_DEFAULTS[tpl.type]
        if (prev && existing[0].body === prev.body) {
          await queryExec('UPDATE templates SET name = $1, subject = $2, body = $3 WHERE type = $4',
            [tpl.name, tpl.subject, tpl.body, tpl.type])
          console.log(`[SEED] Upgraded default template: ${tpl.type}`)
        }
      }
    }

    const settings = await queryAll('SELECT brand_name FROM settings WHERE id = 1')
    if (settings.length > 0 && !settings[0].brand_name) {
      await queryExec('UPDATE settings SET brand_name = $1 WHERE id = 1', [DEFAULT_BRAND_NAME])
      console.log('[SEED] Set default brand name:', DEFAULT_BRAND_NAME)
    }
  } catch (err) {
    console.error('[SEED] Failed to seed defaults:', err.message)
  }
}

const server = app.listen(PORT, async () => {
  await runCatchUp()
  await seedDefaults()
  scheduleJobs()
  console.log(`Server running at http://localhost:${PORT}`)

  // Keep-alive ping to prevent Supabase/Render from sleeping (every 10 minutes)
  setInterval(async () => {
    try {
      const { queryOne } = await import('./db/pool.js')
      await queryOne('SELECT 1')
      console.log('[KEEP-ALIVE] Database ping successful')
    } catch (err) {
      console.error('[KEEP-ALIVE] Database ping failed:', err.message)
    }
  }, 10 * 60 * 1000) // 10 minutes
})

export default app