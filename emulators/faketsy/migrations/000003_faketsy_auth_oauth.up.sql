-- Demo accounts, Etsy-shaped OAuth artifacts (PKCE on auth codes), listing fields for UI/catalog.

ALTER TABLE faketsy_listings
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS price_cents BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE faketsy_listings SET
    description = 'Practice listing for CrossListr image uploads.',
    price_cents = 999,
    currency = 'USD',
    updated_at = now()
WHERE listing_id = 910001001;

CREATE TABLE faketsy_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    default_shop_id BIGINT NOT NULL REFERENCES faketsy_shops (shop_id) ON DELETE RESTRICT
);

CREATE INDEX faketsy_users_email_lower_idx ON faketsy_users ((lower(email)));

CREATE TABLE faketsy_oauth_auth_codes (
    code TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    owner_sub TEXT NOT NULL,
    code_challenge TEXT NOT NULL,
    code_challenge_method TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX faketsy_oauth_auth_codes_expires_at_idx ON faketsy_oauth_auth_codes (expires_at);

CREATE TABLE faketsy_oauth_access_tokens (
    token TEXT PRIMARY KEY,
    owner_sub TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX faketsy_oauth_access_expires_at_idx ON faketsy_oauth_access_tokens (expires_at);

CREATE TABLE faketsy_oauth_refresh_tokens (
    token TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    owner_sub TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX faketsy_oauth_refresh_expires_at_idx ON faketsy_oauth_refresh_tokens (expires_at);
