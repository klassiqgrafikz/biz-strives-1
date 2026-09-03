-- BizStrives Database Schema for Supabase (PostgreSQL)
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (single admin)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (single row, id=1)
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO settings (id, business_name, brand_name, timezone, statement_day, statement_time)
VALUES (1, 'BizStrives', 'BizStrives', 'Africa/Lagos', 0, '21:00')
ON CONFLICT (id) DO NOTHING;

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    birthday DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(active);
CREATE INDEX IF NOT EXISTS idx_customers_birthday ON customers(birthday);

-- Payments (income)
CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount_cents BIGINT NOT NULL,
    method TEXT DEFAULT 'bank_transfer',
    note TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_received_at ON payments(received_at);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    amount_cents BIGINT NOT NULL,
    description TEXT,
    spent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON expenses(spent_at);

-- Savings
CREATE TABLE IF NOT EXISTS savings (
    id BIGSERIAL PRIMARY KEY,
    amount_cents BIGINT NOT NULL,
    description TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_saved_at ON savings(saved_at);

-- Message templates
CREATE TABLE IF NOT EXISTS templates (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL
);

-- Message log
CREATE TABLE IF NOT EXISTS message_log (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_log_type ON message_log(type);
CREATE INDEX IF NOT EXISTS idx_message_log_sent_at ON message_log(sent_at);

-- Job runs tracking (prevents duplicate runs on restart)
CREATE TABLE IF NOT EXISTS job_runs (
    id BIGSERIAL PRIMARY KEY,
    job_name TEXT NOT NULL, -- 'birthday' or 'monthly'
    period_key TEXT NOT NULL, -- '2026-09' for monthly, '2026-09-03' for birthday
    run_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (job_name, period_key)
);

-- Insert default templates
INSERT INTO templates (name, subject, body, type) VALUES
('Monthly Statement',
 'Your {month} Statement from {brand}',
 'Dear {name},

Your statement for {month} is ready.

Summary:
- Total Received: {total_received}
- Total Spent: {total_spent}
- Saved: {total_saved}
- Net Cash: {net_cash}

View full details in your BizStrives dashboard.

Regards,
{brand}',
 'monthly'),
('Birthday Greeting',
 'Happy Birthday from {brand}!',
 'Dear {name},

Happy Birthday! 🎉

On behalf of everyone at {brand}, we wish you a wonderful day and a fantastic year ahead. Thank you for being a valued part of our community.

Warm regards,
The {brand} Team',
 'birthday')
ON CONFLICT (name) DO NOTHING;