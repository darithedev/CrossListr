ALTER TABLE fakebay_listings ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE fakebay_listings SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE fakebay_listings ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE fakebay_listings ALTER COLUMN updated_at SET DEFAULT now();
