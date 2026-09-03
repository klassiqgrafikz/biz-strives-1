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
import adminRoutes from './routes/admin.js'
import healthRoutes from './routes/health.js'
import { runCatchUp, scheduleJobs } from './jobs/cron.js'

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

const server = app.listen(PORT, async () => {
  await runCatchUp()
  scheduleJobs()
  console.log(`Server running at http://localhost:${PORT}`)

  // Keep-alive ping to prevent Supabase/Render from sleeping (every 6 hours)
  setInterval(async () => {
    try {
      const { queryOne } = await import('./db/pool.js')
      await queryOne('SELECT 1')
      console.log('[KEEP-ALIVE] Database ping successful')
    } catch (err) {
      console.error('[KEEP-ALIVE] Database ping failed:', err.message)
    }
  }, 6 * 60 * 60 * 1000) // 6 hours
})

export default app