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

    const manualOpening = settings?.opening_balance_cents > 0 ? Number(settings.opening_balance_cents) : null
    let openingBalance
    if (manualOpening !== null) {
      openingBalance = manualOpening
    } else {
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
      openingBalance = prevIncomeTotal - prevExpenseTotal - prevSavingsTotal
    }
    const closingBalance = openingBalance + net

    function toLagos(d) {
      const dt = d instanceof Date ? d : new Date(d)
      return new Date(dt.getTime() + 3600000)
    }

    function fmtDate(d) {
      const dt = toLagos(d)
      const day = String(dt.getUTCDate()).padStart(2, '0')
      const month = dt.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })
      const year = dt.getUTCFullYear()
      return `${day}-${month}-${year}`
    }

    function fmtTime(d) {
      const dt = toLagos(d)
      return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    }

    function fmtNairaFull(cents) {
      return 'NGN ' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
      ...payments.map((p, i) => ({ type: 'payment', date: p.received_at, amount: Number(p.amount_cents), data: p })),
      ...expenses.map((e, i) => ({ type: 'expense', date: e.spent_at, amount: -Number(e.amount_cents), data: e })),
      ...savings.map((s, i) => ({ type: 'savings', date: s.saved_at, amount: Number(s.amount_cents), data: s }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date))

    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks = []

    const pageWidth = doc.page.width - 80
    const colWidths = [52, 52, 140, 70, 66, 66, 69]
    const tableLeft = 40
    const rowHeight = 18
    const headerHeight = 22
    const footerReserve = 30
    const pageBottom = doc.page.height - 40 - footerReserve

    let pageCount = 1

    const clipText = (s, n = 30) => {
      const t = String(s || '')
      return t.length > n ? t.slice(0, n - 3).trimEnd() + '...' : t
    }

    function drawHeader() {
      const top = doc.y
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text(settings?.brand_name || 'Klassiq Grafikz', tableLeft, top, { align: 'center', width: pageWidth })
      doc.fontSize(9).font('Helvetica').text('STATEMENT OF ACCOUNT', tableLeft, top + 22, { align: 'center', width: pageWidth })
      doc.fontSize(8).font('Helvetica').fillColor('#666666').text(`Account: ${maskAccount(settings?.account_number)} | Currency: NGN`, tableLeft, top + 38, { align: 'center', width: pageWidth })
      doc.fillColor('#000000')
      doc.fontSize(8).font('Helvetica').text(`Account Holder: ${settings?.business_name || 'BizStrives'}`, tableLeft, top + 56)
      doc.text(`Statement Period: ${fmtDate(start)} to ${fmtDate(end)}`, tableLeft, top + 68)
      doc.text(`Issue Date: ${fmtDate(new Date())}`, tableLeft, top + 80)
      doc.y = top + 96
    }

    function drawSummaryBox() {
      const boxTop = doc.y
      const boxHeight = 80
      const right = tableLeft + pageWidth - 10
      const col2 = 220
      const col3 = 400

      doc.rect(tableLeft, boxTop, pageWidth, boxHeight).stroke('#cccccc')
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333')
      doc.text('ACCOUNT SUMMARY', tableLeft + 10, boxTop + 8)
      doc.fillColor('#000000')

      doc.fontSize(8).font('Helvetica').fillColor('#666666')
      doc.text('Opening Balance', tableLeft + 10, boxTop + 28)
      doc.text('Total Lodgments (Cr)', tableLeft + 10, boxTop + 42)
      doc.text('Total Withdrawals (Dr)', tableLeft + 10, boxTop + 56)
      doc.fillColor('#000000')

      doc.fontSize(9).font('Helvetica-Bold')
      doc.text(fmtNairaFull(openingBalance), tableLeft + 10, boxTop + 28, { align: 'right', width: col2 - tableLeft - 10 })
      doc.text(fmtNairaFull(incomeTotal), tableLeft + 10, boxTop + 42, { align: 'right', width: col2 - tableLeft - 10 })
      doc.text(fmtNairaFull(expenseTotal), tableLeft + 10, boxTop + 56, { align: 'right', width: col2 - tableLeft - 10 })

      doc.fontSize(8).font('Helvetica').fillColor('#666666')
      doc.text('Closing Balance', col3 + 10, boxTop + 28)
      doc.fillColor('#000000')
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#006600')
      doc.text(fmtNairaFull(closingBalance), col3 + 10, boxTop + 28, { align: 'right', width: right - col3 - 10 })
      doc.fillColor('#000000')

      doc.y = boxTop + boxHeight + 10
    }

    function drawTableHeader() {
      const top = doc.y
      const headers = ['Txn Date', 'Value Date', 'Narration', 'Reference', 'Withdrawal (Dr)', 'Lodgment (Cr)', 'Balance']
      doc.rect(tableLeft, top, pageWidth, headerHeight).fill('#f0f0f0')
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#333333')
      let x = tableLeft
      headers.forEach((h, i) => {
        doc.text(h, x + 3, top + 6, { width: colWidths[i] - 6, align: i >= 4 ? 'right' : 'left', lineBreak: false })
        x += colWidths[i]
      })
      doc.fillColor('#000000')
      doc.y = top + headerHeight
    }

    function drawFooter() {
      const bottomY = doc.page.height - 40 - 24
      doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666666')
      doc.text('This is a computer-generated statement. No signature required.', tableLeft, bottomY - 12, { align: 'center', width: pageWidth })
      doc.text(`Page ${pageCount} | Generated on ${fmtDate(new Date())} at ${fmtTime(new Date())}`, tableLeft, bottomY, { align: 'center', width: pageWidth })
      doc.fillColor('#000000')
    }

    function drawRow(row, rowIdx, balance) {
      if (doc.y + rowHeight > pageBottom) {
        drawFooter()
        doc.addPage()
        pageCount++
        drawHeader()
        drawTableHeader()
      }

      const rowTop = doc.y
      if (rowIdx % 2 === 0) {
        doc.rect(tableLeft, rowTop, pageWidth, rowHeight).fill('#fafafa')
      }

      const txnDate = fmtDate(row.date)
      const valueDate = fmtDate(row.date)
      const narration = clipText(buildNarration(row.type, row.data))
      const reference = buildReference(row.type, row.data, rowIdx)
      const withdrawal = row.amount < 0 ? fmtNairaFull(Math.abs(row.amount)) : ''
      const lodgment = row.amount > 0 ? fmtNairaFull(row.amount) : ''
      const balanceStr = fmtNairaFull(balance)

      let x = tableLeft
      doc.fontSize(7).font('Helvetica').fillColor('#333333')
      const values = [txnDate, valueDate, narration, reference, withdrawal, lodgment, balanceStr]
      values.forEach((v, i) => {
        doc.text(v, x + 3, rowTop + 3, { width: colWidths[i] - 6, align: i >= 4 ? 'right' : 'left', lineBreak: false })
        x += colWidths[i]
      })
      doc.fillColor('#000000')
      doc.y = rowTop + rowHeight
    }

    await new Promise((resolve, reject) => {
      doc.on('data', c => chunks.push(c))
      doc.on('end', resolve)
      doc.on('error', reject)

      drawHeader()
      drawSummaryBox()
      drawTableHeader()

      let runningBalance = openingBalance
      allTxns.forEach((txn, idx) => {
        runningBalance += txn.amount
        drawRow(txn, idx, runningBalance)
      })

      drawFooter()

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