-- BizStrives migration: payments support manual income + source
ALTER TABLE payments ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'customer';