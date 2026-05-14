-- Persistent OAuth artifacts (auth codes, access + refresh tokens) for multi-instance / restart-safe FakeBay.

CREATE TABLE fakebay_oauth_auth_codes (
    code TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    owner_sub TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX fakebay_oauth_auth_codes_expires_at_idx ON fakebay_oauth_auth_codes (expires_at);

CREATE TABLE fakebay_oauth_access_tokens (
    token TEXT PRIMARY KEY,
    owner_sub TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX fakebay_oauth_access_expires_at_idx ON fakebay_oauth_access_tokens (expires_at);

CREATE TABLE fakebay_oauth_refresh_tokens (
    token TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    owner_sub TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX fakebay_oauth_refresh_expires_at_idx ON fakebay_oauth_refresh_tokens (expires_at);
