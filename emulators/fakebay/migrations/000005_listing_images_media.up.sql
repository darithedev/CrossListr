CREATE TABLE fakebay_media (
    id TEXT PRIMARY KEY,
    seller_id BIGINT NOT NULL REFERENCES fakebay_users (id) ON DELETE CASCADE,
    mime TEXT NOT NULL,
    bytes_size BIGINT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fakebay_listings ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX fakebay_media_seller_idx ON fakebay_media (seller_id);
