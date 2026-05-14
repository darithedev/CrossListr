DROP INDEX IF EXISTS fakebay_media_seller_idx;
ALTER TABLE fakebay_listings DROP COLUMN IF EXISTS images;
DROP TABLE IF EXISTS fakebay_media;
