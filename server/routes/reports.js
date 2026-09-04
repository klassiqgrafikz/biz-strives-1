import { Router } from 'express'
import PDFDocument from 'pdfkit'
import { requireAuth } from '../routes/auth.js'
import { queryAll, queryOne } from '../db/pool.js'

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

// GET /api/reports?month=YYYY-MM
router.get('/', async (req, res) => {
  try {
    const { month } = req.query
    const date = month ? new Date(month + '-01') : new Date()
    const { start, end } = getMonthRange(date)

    const [payments, expenses, savings] = await Promise.all([
      queryAll(
        `SELECT p.*, COALESCE(c.name, 'Manual') as customer_name
         FROM payments p
         LEFT JOIN customers c ON p.customer_id = c.id
         WHERE p.received_at BETWEEN $1 AND $2
         ORDER BY p.received_at`,
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
    const savingsTotal = savings.reduce((s, s_) => s + s_.amount_cents, 0)
    const net = incomeTotal - expenseTotal - savingsTotal

    res.json({
      data: {
        payments,
        expenses,
        savings,
        incomeTotal,
        expenseTotal,
        savingsTotal,
        net
      }
    })
  } catch (err) {
    console.error('GET /reports error:', err)
    res.status(500).json({ error: 'Failed to fetch report' })
  }
})

// GET /api/reports/pdf?month=YYYY-MM
router.get('/pdf', async (req, res) => {
  try {
    const { month } = req.query
    const date = month ? new Date(month + '-01') : new Date()
    const { start, end } = getMonthRange(date)

    const [payments, expenses, savings] = await Promise.all([
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

    const settings = await queryOne('SELECT * FROM settings WHERE id = 1')
    const incomeTotal = payments.reduce((s, p) => s + p.amount_cents, 0)
    const expenseTotal = expenses.reduce((s, e) => s + e.amount_cents, 0)
    const savingsTotal = savings.reduce((s, s_) => s + s_.amount_cents, 0)
    const net = incomeTotal - expenseTotal - savingsTotal

    const doc = new PDFDocument({ margin: 50 })
    const chunks = []

    await new Promise((resolve, reject) => {
      doc.on('data', c => chunks.push(c))
      doc.on('end', resolve)
      doc.on('error', reject)

      doc.fontSize(24).font('Helvetica-Bold').text(settings?.brand_name || 'BizStrives', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(14).font('Helvetica').text(
        `Monthly Statement - ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        { align: 'center' }
      )
      doc.moveDown(1)

      doc.fontSize(12).font('Helvetica-Bold').text('Income Received')
      doc.moveDown(0.3)
      if (payments.length === 0) {
        doc.font('Helvetica').text('No income recorded for this period.')
      }
      payments.forEach(p => {
        doc.font('Helvetica').text(
          `${p.received_at.split('T')[0]}  ${p.customer_name}  ${fmtNaira(p.amount_cents)}  ${p.method}  ${p.note || ''}`
        )
      })
      doc.moveDown(0.5)
      doc.font('Helvetica-Bold').text(`Total Income: ${fmtNaira(incomeTotal)}`)
      doc.moveDown(1)

      doc.fontSize(12).font('Helvetica-Bold').text('Expenses')
      doc.moveDown(0.3)
      if (expenses.length === 0) {
        doc.font('Helvetica').text('No expenses recorded for this period.')
      }
      expenses.forEach(e => {
        doc.font('Helvetica').text(
          `${e.spent_at.split('T')[0]}  ${e.category}  ${fmtNaira(e.amount_cents)}  ${e.description || ''}`
        )
      })
      doc.moveDown(0.5)
      doc.font('Helvetica-Bold').text(`Total Expenses: ${fmtNaira(expenseTotal)}`)
      doc.moveDown(1)

      doc.fontSize(12).font('Helvetica-Bold').text('Savings')
      doc.moveDown(0.3)
      if (savings.length === 0) {
        doc.font('Helvetica').text('No savings recorded for this period.')
      }
      savings.forEach(s => {
        const prefix = s.amount_cents >= 0 ? '+' : ''
        doc.font('Helvetica').text(
          `${s.saved_at.split('T')[0]}  ${prefix}${fmtNaira(Math.abs(s.amount_cents))}  ${s.description || ''}`
        )
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
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="statement-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}.pdf"`
    )
    res.send(pdfBuffer)
  } catch (err) {
    console.error('GET /reports/pdf error:', err)
    res.status(500).json({ error: 'Failed to generate PDF' })
  }
})

export default router