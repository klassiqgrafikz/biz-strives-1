const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'bizstrives.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'BizStrives',
  brand_name TEXT NOT NULL DEFAULT 'BizStrives',
  tagline TEXT,
  statement_email TEXT,
  timezone TEXT DEFAULT 'Africa/Lagos',
  statement_day INTEGER DEFAULT 0,
  statement_time TEXT DEFAULT '21:00',
  gmail_user TEXT,
  gmail_app_password TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  birthday DATE,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  method TEXT DEFAULT 'bank_transfer',
  note TEXT,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  description TEXT,
  spent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_cents INTEGER NOT NULL,
  description TEXT,
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS message_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(active);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(received_at);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(spent_at);
CREATE INDEX IF NOT EXISTS idx_savings_date ON savings(saved_at);
CREATE INDEX IF NOT EXISTS idx_message_log_type ON message_log(type);
`);

const existingSettings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
if (!existingSettings) {
  db.prepare('INSERT INTO settings (id, business_name, brand_name, timezone, statement_day, statement_time) VALUES (1, ?, ?, ?, ?, ?)')
    .run('BizStrives', 'BizStrives', 'Africa/Lagos', 0, '21:00');
}

const existingTemplates = db.prepare('SELECT COUNT(*) as c FROM templates').get();
if (existingTemplates.c === 0) {
  const insertTpl = db.prepare('INSERT INTO templates (name, subject, body, type) VALUES (?, ?, ?, ?)');
  insertTpl.run(
    'Monthly Statement',
    'Your {month} Statement from {brand}',
    `Dear {name},

Your statement for {month} is ready.

Summary:
- Total Received: {total_received}
- Total Spent: {total_spent}
- Saved: {total_saved}
- Net Cash: {net_cash}

View full details in your BizStrives dashboard.

Regards,
{brand}`,
    'monthly'
  );
  insertTpl.run(
    'Birthday Greeting',
    'Happy Birthday from {brand}!',
    `Dear {name},

Happy Birthday! 🎉

On behalf of everyone at {brand}, we wish you a wonderful day and a fantastic year ahead. Thank you for being a valued part of our community.

Warm regards,
The {brand} Team`,
    'birthday'
  );
}

db.close();
console.log('Database initialized at', dbPath);