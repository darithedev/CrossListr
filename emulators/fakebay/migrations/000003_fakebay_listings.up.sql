CREATE TABLE fakebay_listings (
    id              bigserial PRIMARY KEY,
    seller_id       bigint NOT NULL REFERENCES fakebay_users (id) ON DELETE CASCADE,
    title           text NOT NULL,
    description     text NOT NULL DEFAULT '',
    price_cents     bigint NOT NULL CHECK (price_cents >= 0),
    currency        char(3) NOT NULL DEFAULT 'USD',
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fakebay_listings_seller_created_idx ON fakebay_listings (seller_id, created_at DESC);
