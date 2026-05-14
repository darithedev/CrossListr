-- Etsy Open API–shaped shop + listings + multipart listing image uploads.

CREATE TABLE fakesty_shops (
    shop_id BIGINT PRIMARY KEY,
    shop_name TEXT NOT NULL
);

INSERT INTO fakesty_shops (shop_id, shop_name) VALUES (1, 'Dev Fakesty shop')
ON CONFLICT (shop_id) DO NOTHING;

CREATE TABLE fakesty_listings (
    listing_id BIGINT PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES fakesty_shops (shop_id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT ''
);

-- Stable dev listing referenced by Etsy tutorial–style uploads: shops/1/listings/{id}/images
INSERT INTO fakesty_listings (listing_id, shop_id, title) VALUES (910001001, 1, 'Dev draft listing')
ON CONFLICT (listing_id) DO NOTHING;

CREATE TABLE fakesty_listing_images (
    listing_image_id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES fakesty_listings (listing_id) ON DELETE CASCADE,
    shop_id BIGINT NOT NULL REFERENCES fakesty_shops (shop_id) ON DELETE CASCADE,
    rank INT NOT NULL,
    mime_type TEXT NOT NULL,
    bytes_size BIGINT NOT NULL,
    original_filename TEXT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (listing_id, rank)
);
