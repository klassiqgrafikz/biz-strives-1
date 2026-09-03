require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const cron = require('node-cron');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

function fmtNaira(cents) {
  return '₦' + (cents / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getSettings() {
  return db.prepare('SELECT * FROM settings WHERE id = 1').get();
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getDashboardData() {
  const { start, end } = getMonthRange();
  const income = db.prepare('SELECT COALESCE(SUM(amount_cents),0) as total FROM payments WHERE received_at BETWEEN ? AND ?').get(start, end).total;
  const expenses = db.prepare('SELECT COALESCE(SUM(amount_cents),0) as total FROM expenses WHERE spent_at BETWEEN ? AND ?').get(start, end).total;
  const savings = db.prepare('SELECT COALESCE(SUM(amount_cents),0) as total FROM savings WHERE saved_at BETWEEN ? AND ?').get(start, end).total;
  const net = income - expenses - savings;
  const savingsBalance = db.prepare('SELECT COALESCE(SUM(amount_cents),0) as total FROM savings').get().total;
  return { income, expenses, savings, net, savingsBalance };
}

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.render('login', { error: 'Invalid username or password' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/register', (req, res) => {
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existing.c > 0) return res.redirect('/login');
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existing.c > 0) return res.redirect('/login');
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.render('register', { error: 'Username and password (min 6 chars) required' });
  }
  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  req.session.userId = result.lastInsertRowid;
  req.session.username = username;
  res.redirect('/dashboard');
});

app.get('/dashboard', requireAuth, (req, res) => {
  const data = getDashboardData();
  const recentPayments = db.prepare(`
    SELECT p.*, c.name as customer_name
    FROM payments p JOIN customers c ON p.customer_id = c.id
    ORDER BY p.received_at DESC LIMIT 5
  `).all();
  const recentExpenses = db.prepare(`
    SELECT * FROM expenses ORDER BY spent_at DESC LIMIT 5
  `).all();
  res.render('dashboard', {
    ...data,
    fmtNaira,
    recentPayments,
    recentExpenses,
    settings: getSettings()
  });
});

app.get('/customers', requireAuth, (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
  res.render('customers', { customers, settings: getSettings() });
});

app.post('/customers', requireAuth, (req, res) => {
  const { name, email, phone, birthday, active } = req.body;
  if (!name || !email) return res.redirect('/customers?error=Name and email required');
  db.prepare('INSERT INTO customers (name, email, phone, birthday, active) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, phone || null, birthday || null, active ? 1 : 0);
  res.redirect('/customers');
});

app.post('/customers/:id/delete', requireAuth, (req, res) => {
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.redirect('/customers');
});

app.get('/payments', requireAuth, (req, res) => {
  const payments = db.prepare(`
    SELECT p.*, c.name as customer_name FROM payments p
    JOIN customers c ON p.customer_id = c.id
    ORDER BY p.received_at DESC
  `).all();
  const customers = db.prepare('SELECT id, name FROM customers WHERE active = 1').all();
  res.render('payments', { payments, customers, fmtNaira, settings: getSettings() });
});

app.post('/payments', requireAuth, (req, res) => {
  const { customer_id, amount, method, note } = req.body;
  const cents = Math.round(parseFloat(amount) * 100);
  if (!customer_id || !cents) return res.redirect('/payments?error=Customer and amount required');
  db.prepare('INSERT INTO payments (customer_id, amount_cents, method, note) VALUES (?, ?, ?, ?)')
    .run(customer_id, cents, method || 'bank_transfer', note || null);
  res.redirect('/payments');
});

app.post('/payments/:id/delete', requireAuth, (req, res) => {
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.redirect('/payments');
});

app.get('/expenses', requireAuth, (req, res) => {
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY spent_at DESC').all();
  res.render('expenses', { expenses, fmtNaira, settings: getSettings() });
});

app.post('/expenses', requireAuth, (req, res) => {
  const { category, amount, description } = req.body;
  const cents = Math.round(parseFloat(amount) * 100);
  if (!category || !cents) return res.redirect('/expenses?error=Category and amount required');
  db.prepare('INSERT INTO expenses (category, amount_cents, description) VALUES (?, ?, ?)')
    .run(category, cents, description || null);
  res.redirect('/expenses');
});

app.post('/expenses/:id/delete', requireAuth, (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.redirect('/expenses');
});

app.get('/savings', requireAuth, (req, res) => {
  const entries = db.prepare('SELECT * FROM savings ORDER BY saved_at DESC').all();
  const balance = db.prepare('SELECT COALESCE(SUM(amount_cents),0) as total FROM savings').get().total;
  res.render('savings', { entries, balance, fmtNaira, settings: getSettings() });
});

app.post('/savings', requireAuth, (req, res) => {
  const { amount, description, action } = req.body;
  const cents = Math.round(parseFloat(amount) * 100);
  if (!cents) return res.redirect('/savings?error=Amount required');
  if (action === 'withdraw') {
    const balance = db.prepare('SELECT COALESCE(SUM(amount_cents),0) as total FROM savings').get().total;
    if (cents > balance) return res.redirect('/savings?error=Insufficient savings balance');
    db.prepare('INSERT INTO savings (amount_cents, description) VALUES (?, ?)').run(-cents, description || 'Withdrawal');
  } else {
    db.prepare('INSERT INTO savings (amount_cents, description) VALUES (?, ?)').run(cents, description || 'Deposit');
  }
  res.redirect('/savings');
});

app.get('/reports', requireAuth, (req, res) => {
  const { month } = req.query;
  const date = month ? new Date(month + '-01') : new Date();
  const { start, end } = getMonthRange(date);
  const payments = db.prepare(`
    SELECT p.*, c.name as customer_name FROM payments p
    JOIN customers c ON p.customer_id = c.id
    WHERE p.received_at BETWEEN ? AND ? ORDER BY p.received_at
  `).all(start, end);
  const expenses = db.prepare('SELECT * FROM expenses WHERE spent_at BETWEEN ? AND ? ORDER BY spent_at').all(start, end);
  const savingsEntries = db.prepare('SELECT * FROM savings WHERE saved_at BETWEEN ? AND ? ORDER BY saved_at').all(start, end);
  const incomeTotal = payments.reduce((s, p) => s + p.amount_cents, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const savingsTotal = savingsEntries.reduce((s, e) => s + e.amount_cents, 0);
  const net = incomeTotal - expenseTotal - savingsTotal;
  res.render('reports', {
    month: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
    payments, expenses, savingsEntries,
    incomeTotal, expenseTotal, savingsTotal, net,
    fmtNaira, settings: getSettings()
  });
});

app.get('/reports/pdf', requireAuth, (req, res) => {
  const PDFDocument = require('pdfkit');
  const { month } = req.query;
  const date = month ? new Date(month + '-01') : new Date();
  const { start, end } = getMonthRange(date);
  const payments = db.prepare(`
    SELECT p.*, c.name as customer_name FROM payments p
    JOIN customers c ON p.customer_id = c.id
    WHERE p.received_at BETWEEN ? AND ? ORDER BY p.received_at
  `).all(start, end);
  const expenses = db.prepare('SELECT * FROM expenses WHERE spent_at BETWEEN ? AND ? ORDER BY spent_at').all(start, end);
  const savingsEntries = db.prepare('SELECT * FROM savings WHERE saved_at BETWEEN ? AND ? ORDER BY saved_at').all(start, end);
  const incomeTotal = payments.reduce((s, p) => s + p.amount_cents, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const savingsTotal = savingsEntries.reduce((s, e) => s + e.amount_cents, 0);
  const net = incomeTotal - expenseTotal - savingsTotal;
  const settings = getSettings();

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="statement-${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}.pdf"`);
  doc.pipe(res);

  doc.fontSize(24).font('Helvetica-Bold').text(settings.brand_name || 'BizStrives', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica').text(`Monthly Statement - ${date.toLocaleString('default', { month: 'long', year: 'numeric' })}`, { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(12).font('Helvetica-Bold').text('Income Received');
  doc.moveDown(0.3);
  payments.forEach(p => {
    doc.font('Helvetica').text(`${p.received_at.split('T')[0]}  ${p.customer_name}  ${fmtNaira(p.amount_cents)}  ${p.method}  ${p.note || ''}`);
  });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Total Income: ${fmtNaira(incomeTotal)}`);
  doc.moveDown(1);

  doc.fontSize(12).font('Helvetica-Bold').text('Expenses');
  doc.moveDown(0.3);
  expenses.forEach(e => {
    doc.font('Helvetica').text(`${e.spent_at.split('T')[0]}  ${e.category}  ${fmtNaira(e.amount_cents)}  ${e.description || ''}`);
  });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Total Expenses: ${fmtNaira(expenseTotal)}`);
  doc.moveDown(1);

  doc.fontSize(12).font('Helvetica-Bold').text('Savings');
  doc.moveDown(0.3);
  savingsEntries.forEach(s => {
    const prefix = s.amount_cents >= 0 ? '+' : '';
    doc.font('Helvetica').text(`${s.saved_at.split('T')[0]}  ${prefix}${fmtNaira(s.amount_cents)}  ${s.description || ''}`);
  });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Total Savings: ${fmtNaira(savingsTotal)}`);
  doc.moveDown(1);

  doc.fontSize(14).font('Helvetica-Bold').text(`Net Cash Flow: ${fmtNaira(net)}`, { align: 'right' });
  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Oblique').text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });

  doc.end();
});

app.get('/messages', requireAuth, (req, res) => {
  const templates = db.prepare('SELECT * FROM templates').all();
  const log = db.prepare('SELECT ml.*, c.name as customer_name FROM message_log ml LEFT JOIN customers c ON ml.customer_id = c.id ORDER BY ml.sent_at DESC LIMIT 50').all();
  res.render('messages', { templates, log, settings: getSettings() });
});

app.post('/messages/templates', requireAuth, (req, res) => {
  const { name, subject, body, type } = req.body;
  if (!name || !subject || !body || !type) return res.redirect('/messages?error=All fields required');
  db.prepare('INSERT OR REPLACE INTO templates (name, subject, body, type) VALUES (?, ?, ?, ?)')
    .run(name, subject, body, type);
  res.redirect('/messages');
});

app.post('/messages/templates/:id/delete', requireAuth, (req, res) => {
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.redirect('/messages');
});

app.get('/settings', requireAuth, (req, res) => {
  res.render('settings', { settings: getSettings() });
});

app.post('/settings', requireAuth, (req, res) => {
  const { business_name, brand_name, tagline, statement_email, timezone, statement_day, statement_time, gmail_user, gmail_app_password } = req.body;
  db.prepare(`
    UPDATE settings SET
      business_name = ?, brand_name = ?, tagline = ?, statement_email = ?,
      timezone = ?, statement_day = ?, statement_time = ?,
      gmail_user = ?, gmail_app_password = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(business_name, brand_name, tagline, statement_email, timezone, statement_day, statement_time, gmail_user, gmail_app_password);
  res.redirect('/settings');
});

async function sendEmail(to, subject, html) {
  const settings = getSettings();
  if (!settings.gmail_user || !settings.gmail_app_password) {
    console.log('[EMAIL] Not configured - would send to:', to, subject);
    return { skipped: true };
  }
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: settings.gmail_user, pass: settings.gmail_app_password }
  });
  await transporter.sendMail({
    from: `"${settings.brand_name}" <${settings.gmail_user}>`,
    to,
    subject,
    html
  });
  return { sent: true };
}

function renderTemplate(template, vars) {
  let html = template.body;
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return html;
}

async function runBirthdayJob() {
  console.log('[CRON] Running birthday check...');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: getSettings().timezone }).split('-').slice(1).join('-');
  const customers = db.prepare("SELECT * FROM customers WHERE active = 1 AND strftime('%m-%d', birthday) = ?").all(today);
  if (customers.length === 0) return console.log('[CRON] No birthdays today');
  const tpl = db.prepare("SELECT * FROM templates WHERE type = 'birthday' LIMIT 1").get();
  if (!tpl) return console.log('[CRON] No birthday template');
  const settings = getSettings();
  for (const c of customers) {
    const html = renderTemplate(tpl, { name: c.name, brand: settings.brand_name });
    await sendEmail(c.email, tpl.subject.replace('{brand}', settings.brand_name), html);
    db.prepare('INSERT INTO message_log (customer_id, type, status) VALUES (?, ?, ?)').run(c.id, 'birthday', 'sent');
    console.log('[CRON] Birthday sent to', c.email);
  }
}

async function runMonthlyJob() {
  console.log('[CRON] Running month-end job...');
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const { start, end } = getMonthRange(lastMonth);
  const settings = getSettings();
  if (!settings.statement_email) return console.log('[CRON] No statement email configured');

  const payments = db.prepare(`
    SELECT p.*, c.name as customer_name FROM payments p
    JOIN customers c ON p.customer_id = c.id
    WHERE p.received_at BETWEEN ? AND ? ORDER BY p.received_at
  `).all(start, end);
  const expenses = db.prepare('SELECT * FROM expenses WHERE spent_at BETWEEN ? AND ? ORDER BY spent_at').all(start, end);
  const savingsEntries = db.prepare('SELECT * FROM savings WHERE saved_at BETWEEN ? AND ? ORDER BY saved_at').all(start, end);
  const incomeTotal = payments.reduce((s, p) => s + p.amount_cents, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const savingsTotal = savingsEntries.reduce((s, e) => s + e.amount_cents, 0);
  const net = incomeTotal - expenseTotal - savingsTotal;

  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', async () => {
    const pdfBuffer = Buffer.concat(chunks);
    await sendEmail(settings.statement_email,
      `Monthly Statement - ${lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      `<p>Your monthly statement is attached.</p>`
    );
    console.log('[CRON] Statement emailed to', settings.statement_email);
  });

  doc.fontSize(24).font('Helvetica-Bold').text(settings.brand_name || 'BizStrives', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica').text(`Monthly Statement - ${lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica-Bold').text('Income Received');
  doc.moveDown(0.3);
  payments.forEach(p => doc.font('Helvetica').text(`${p.received_at.split('T')[0]}  ${p.customer_name}  ${fmtNaira(p.amount_cents)}  ${p.method}  ${p.note || ''}`));
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Total Income: ${fmtNaira(incomeTotal)}`);
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica-Bold').text('Expenses');
  doc.moveDown(0.3);
  expenses.forEach(e => doc.font('Helvetica').text(`${e.spent_at.split('T')[0]}  ${e.category}  ${fmtNaira(e.amount_cents)}  ${e.description || ''}`));
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Total Expenses: ${fmtNaira(expenseTotal)}`);
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica-Bold').text('Savings');
  doc.moveDown(0.3);
  savingsEntries.forEach(s => {
    const prefix = s.amount_cents >= 0 ? '+' : '';
    doc.font('Helvetica').text(`${s.saved_at.split('T')[0]}  ${prefix}${fmtNaira(s.amount_cents)}  ${s.description || ''}`);
  });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Total Savings: ${fmtNaira(savingsTotal)}`);
  doc.moveDown(1);
  doc.fontSize(14).font('Helvetica-Bold').text(`Net Cash Flow: ${fmtNaira(net)}`, { align: 'right' });
  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Oblique').text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
  doc.end();

  const tpl = db.prepare("SELECT * FROM templates WHERE type = 'monthly' LIMIT 1").get();
  if (tpl) {
    const activeCustomers = db.prepare('SELECT * FROM customers WHERE active = 1').all();
    for (const c of activeCustomers) {
      const custPayments = payments.filter(p => p.customer_id === c.id);
      const custTotal = custPayments.reduce((s, p) => s + p.amount_cents, 0);
      const html = renderTemplate(tpl, {
        name: c.name,
        brand: settings.brand_name,
        month: lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
        total_received: fmtNaira(custTotal),
        total_spent: fmtNaira(expenseTotal),
        total_saved: fmtNaira(savingsTotal),
        net_cash: fmtNaira(net)
      });
      await sendEmail(c.email, tpl.subject.replace('{brand}', settings.brand_name).replace('{month}', lastMonth.toLocaleString('default', { month: 'long', year: 'numeric' })), html);
      db.prepare('INSERT INTO message_log (customer_id, type, status) VALUES (?, ?, ?)').run(c.id, 'bulk_message', 'sent');
    }
    console.log('[CRON] Bulk messages sent to', activeCustomers.length, 'customers');
  }
}

function scheduleJobs() {
  const tz = getSettings().timezone;
  cron.schedule('0 8 * * *', runBirthdayJob, { timezone: tz });
  cron.schedule('0 21 1 * *', runMonthlyJob, { timezone: tz });
  console.log('[CRON] Jobs scheduled: birthdays 08:00, monthly 1st 21:00 (', tz, ')');
}

async function runCatchUp() {
  console.log('[STARTUP] Checking for missed jobs...');
  await runBirthdayJob();
  await runMonthlyJob();
}

app.post('/admin/run-birthday', requireAuth, async (req, res) => {
  await runBirthdayJob();
  res.redirect('/messages');
});

app.post('/admin/run-monthly', requireAuth, async (req, res) => {
  await runMonthlyJob();
  res.redirect('/messages');
});

const server = app.listen(PORT, async () => {
  await runCatchUp();
  scheduleJobs();
  console.log(`Server running at http://localhost:${PORT}`);
});

module.exports = app;