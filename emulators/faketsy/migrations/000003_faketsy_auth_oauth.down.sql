DROP TABLE IF EXISTS faketsy_oauth_refresh_tokens;
DROP TABLE IF EXISTS faketsy_oauth_access_tokens;
DROP TABLE IF EXISTS faketsy_oauth_auth_codes;
DROP TABLE IF EXISTS faketsy_users;

ALTER TABLE faketsy_listings DROP COLUMN IF EXISTS updated_at;
ALTER TABLE faketsy_listings DROP COLUMN IF EXISTS created_at;
ALTER TABLE faketsy_listings DROP COLUMN IF EXISTS currency;
ALTER TABLE faketsy_listings DROP COLUMN IF EXISTS price_cents;
ALTER TABLE faketsy_listings DROP COLUMN IF EXISTS description;
