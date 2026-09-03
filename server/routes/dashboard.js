import { Router } from 'express'
import { requireAuth } from '../routes/auth.js'
import { queryOne, queryAll } from '../db/pool.js'

const router = Router()

router.use(requireAuth)

function fmtNaira(cents) {
  return '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
  return { start, end }
}

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const { start, end } = getMonthRange()

    const [incomeRow, expenseRow, savingsRow, savingsBalanceRow, recentPayments, recentExpenses] = await Promise.all([
      queryOne('SELECT COALESCE(SUM(amount_cents),0) as total FROM payments WHERE received_at BETWEEN $1 AND $2', [start.toISOString(), end.toISOString()]),
      queryOne('SELECT COALESCE(SUM(amount_cents),0) as total FROM expenses WHERE spent_at BETWEEN $1 AND $2', [start.toISOString(), end.toISOString()]),
      queryOne('SELECT COALESCE(SUM(amount_cents),0) as total FROM savings WHERE saved_at BETWEEN $1 AND $2', [start.toISOString(), end.toISOString()]),
      queryOne('SELECT COALESCE(SUM(amount_cents),0) as total FROM savings'),
      queryAll(
        `SELECT p.*, c.name as customer_name
         FROM payments p
         JOIN customers c ON p.customer_id = c.id
         ORDER BY p.received_at DESC LIMIT 5`
      ),
      queryAll('SELECT * FROM expenses ORDER BY spent_at DESC LIMIT 5')
    ])

    const income = parseInt(incomeRow.total)
    const expenses = parseInt(expenseRow.total)
    const savings = parseInt(savingsRow.total)
    const savingsBalance = parseInt(savingsBalanceRow.total)
    const net = income - expenses - savings

    res.json({
      data: {
        income,
        expenses,
        savings,
        net,
        savingsBalance
      }
    })
  } catch (err) {
    console.error('GET /dashboard error:', err)
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
})

export default router