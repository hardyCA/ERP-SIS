ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
