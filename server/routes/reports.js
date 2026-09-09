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

function dayOf(v) {
  const d = v instanceof Date ? v : new Date(v)
  return d.toLocaleString('en-CA', { timeZone: 'Africa/Lagos' }).slice(0, 10)
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

    const incomeTotal = payments.reduce((s, p) => s + Number(p.amount_cents), 0)
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount_cents), 0)
    const savingsTotal = savings.reduce((s, s_) => s + Number(s_.amount_cents), 0)
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

    const [payments, expenses, savings, settings] = await Promise.all([
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
      ),
      queryOne('SELECT * FROM settings WHERE id = 1')
    ])

    const incomeTotal = payments.reduce((s, p) => s + Number(p.amount_cents), 0)
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount_cents), 0)
    const savingsTotal = savings.reduce((s, s_) => s + Number(s_.amount_cents), 0)
    const net = incomeTotal - expenseTotal - savingsTotal

    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1)
    const prevEnd = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59)
    const prevPayments = await queryAll(
      `SELECT p.amount_cents FROM payments p WHERE p.received_at BETWEEN $1 AND $2`,
      [new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1).toISOString(), prevEnd.toISOString()]
    )
    const prevExpenses = await queryAll(
      'SELECT amount_cents FROM expenses WHERE spent_at BETWEEN $1 AND $2',
      [new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1).toISOString(), prevEnd.toISOString()]
    )
    const prevSavings = await queryAll(
      'SELECT amount_cents FROM savings WHERE saved_at BETWEEN $1 AND $2',
      [new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1).toISOString(), prevEnd.toISOString()]
    )
    const prevIncomeTotal = prevPayments.reduce((s, p) => s + Number(p.amount_cents), 0)
    const prevExpenseTotal = prevExpenses.reduce((s, e) => s + Number(e.amount_cents), 0)
    const prevSavingsTotal = prevSavings.reduce((s, s_) => s + Number(s_.amount_cents), 0)
    const openingBalance = prevIncomeTotal - prevExpenseTotal - prevSavingsTotal
    const closingBalance = openingBalance + net

    function fmtDate(d) {
      const dt = d instanceof Date ? d : new Date(d)
      return dt.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).replace(/ /g, '-')
    }

    function fmtNairaFull(cents) {
      return '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    function maskAccount(num) {
      if (!num) return '**** **** **** ****'
      const clean = num.replace(/\D/g, '')
      const last4 = clean.slice(-4).padStart(4, '0')
      return `**** **** **** ${last4}`
    }

    function buildNarration(type, data) {
      switch (type) {
        case 'payment':
          return data.customer_name === 'Manual' ? 'CASH DEPOSIT' : `CASH DEPOSIT - ${data.customer_name.toUpperCase()}`
        case 'expense':
          return `${data.category.toUpperCase()}${data.description ? ` - ${data.description.toUpperCase()}` : ''}`
        case 'savings':
          return data.amount_cents >= 0 ? 'TRANSFER TO SAVINGS' : 'WITHDRAWAL FROM SAVINGS'
        default:
          return ''
      }
    }

    function buildReference(type, data, idx) {
      const yymm = date.toISOString().slice(2, 4) + date.toISOString().slice(5, 7)
      return `REF${yymm}${String(idx + 1).padStart(3, '0')}`
    }

    const allTxns = [
      ...payments.map((p, i) => ({ type: 'payment', date: p.received_at, amount: Number(p.amount_cents), data: p, index: i })),
      ...expenses.map((e, i) => ({ type: 'expense', date: e.spent_at, amount: -Number(e.amount_cents), data: e, index: i })),
      ...savings.map((s, i) => ({ type: 'savings', date: s.saved_at, amount: Number(s.amount_cents), data: s, index: i }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date))

    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks = []

    await new Promise((resolve, reject) => {
      doc.on('data', c => chunks.push(c))
      doc.on('end', resolve)
      doc.on('error', reject)

      const pageWidth = doc.page.width - 80
      const colWidths = [65, 65, 150, 85, 75, 75, 75]
      const tableLeft = 40

      function drawHeader() {
        doc.fontSize(16).font('Helvetica-Bold').text(settings?.brand_name || 'Klassiq Grafikz', { align: 'center' })
        doc.moveDown(0.2)
        doc.fontSize(9).font('Helvetica').text('STATEMENT OF ACCOUNT', { align: 'center' })
        doc.moveDown(0.3)
        doc.fontSize(8).font('Helvetica').fillColor('#666666').text(`Account: ${maskAccount(settings?.account_number)} | Currency: NGN`, { align: 'center' })
        doc.fillColor('#000000')
        doc.moveDown(0.5)

        const periodStart = fmtDate(start)
        const periodEnd = fmtDate(end)
        const issueDate = fmtDate(new Date())
        doc.fontSize(8).font('Helvetica').text(`Account Holder: ${settings?.business_name || 'BizStrives'}`, 40, doc.y)
        doc.text(`Statement Period: ${periodStart} to ${periodEnd}`, 40, doc.y + 12)
        doc.text(`Issue Date: ${issueDate}`, 40, doc.y + 24)
        doc.moveDown(3)
      }

      function drawSummaryBox() {
        const boxTop = doc.y
        const boxHeight = 80
        const col1 = 40
        const col2 = 220
        const col3 = 400

        doc.rect(col1, boxTop, pageWidth, boxHeight).stroke('#cccccc')
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333')
        doc.text('ACCOUNT SUMMARY', col1 + 10, boxTop + 8)
        doc.fillColor('#000000')

        doc.fontSize(8).font('Helvetica').fillColor('#666666')
        doc.text('Opening Balance', col1 + 10, boxTop + 28)
        doc.text('Total Lodgments (Cr)', col1 + 10, boxTop + 42)
        doc.text('Total Withdrawals (Dr)', col1 + 10, boxTop + 56)
        doc.fillColor('#000000')

        doc.fontSize(9).font('Helvetica-Bold')
        doc.text(fmtNairaFull(openingBalance), col2 + 10, boxTop + 28, { align: 'right', width: 150 })
        doc.text(fmtNairaFull(incomeTotal), col2 + 10, boxTop + 42, { align: 'right', width: 150 })
        doc.text(fmtNairaFull(expenseTotal), col2 + 10, boxTop + 56, { align: 'right', width: 150 })

        doc.fontSize(8).font('Helvetica').fillColor('#666666')
        doc.text('Closing Balance', col3 + 10, boxTop + 28)
        doc.fillColor('#000000')
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#006600')
        doc.text(fmtNairaFull(closingBalance), col3 + 10, boxTop + 28, { align: 'right', width: 150 })
        doc.fillColor('#000000')

        doc.y = boxTop + boxHeight + 10
      }

      function drawTableHeader() {
        const headers = ['Txn Date', 'Value Date', 'Narration', 'Reference', 'Withdrawal (Dr)', 'Lodgment (Cr)', 'Balance']
        let x = tableLeft
        doc.rect(x, doc.y, pageWidth, 22).fill('#f0f0f0')
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#333333')
        headers.forEach((h, i) => {
          doc.text(h, x + 3, doc.y + 5, { width: colWidths[i] - 6, align: i >= 4 ? 'right' : 'left' })
          x += colWidths[i]
        })
        doc.fillColor('#000000')
        doc.y += 22
      }

      function drawRow(row, rowIdx, balance) {
        if (doc.y > 740) {
          doc.addPage()
          drawTableHeader()
        }

        const isEven = rowIdx % 2 === 0
        if (isEven) {
          doc.rect(tableLeft, doc.y, pageWidth, 20).fill('#fafafa')
        }

        const txnDate = fmtDate(row.date)
        const valueDate = fmtDate(row.date)
        const narration = buildNarration(row.type, row.data)
        const reference = buildReference(row.type, row.data, rowIdx)
        const withdrawal = row.amount < 0 ? fmtNairaFull(Math.abs(row.amount)) : ''
        const lodgment = row.amount > 0 ? fmtNairaFull(row.amount) : ''
        const balanceStr = fmtNairaFull(balance)

        let x = tableLeft
        doc.fontSize(7).font('Helvetica').fillColor('#333333')
        const values = [txnDate, valueDate, narration, reference, withdrawal, lodgment, balanceStr]
        values.forEach((v, i) => {
          doc.text(v, x + 3, doc.y + 4, { width: colWidths[i] - 6, align: i >= 4 ? 'right' : 'left' })
          x += colWidths[i]
        })
        doc.fillColor('#000000')
        doc.y += 20
      }

      drawHeader()
      drawSummaryBox()
      drawTableHeader()

      let runningBalance = openingBalance
      allTxns.forEach((txn, idx) => {
        runningBalance += txn.amount
        drawRow(txn, idx, runningBalance)
      })

      doc.moveDown(1)
      doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666666')
      doc.text('This is a computer-generated statement. No signature required.', { align: 'center' })
      doc.text(`Page 1 of 1 | Generated on ${fmtDate(new Date())} at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })}`, { align: 'center' })
      doc.fillColor('#000000')

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