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

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.use('/api/health', healthRoutes)

// Auth routes (no auth required)
app.use('/api/auth', authRoutes)

// Protected routes
import { requireAuth } from './routes/auth.js'
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/savings', savingsRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/admin', adminRoutes)

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