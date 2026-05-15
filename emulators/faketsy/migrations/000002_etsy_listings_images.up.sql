-- Etsy Open API–shaped shop + listings + multipart listing image uploads.

CREATE TABLE faketsy_shops (
    shop_id BIGINT PRIMARY KEY,
    shop_name TEXT NOT NULL
);

INSERT INTO faketsy_shops (shop_id, shop_name) VALUES (1, 'Dev Faketsy shop')
ON CONFLICT (shop_id) DO NOTHING;

CREATE TABLE faketsy_listings (
    listing_id BIGINT PRIMARY KEY,
    shop_id BIGINT NOT NULL REFERENCES faketsy_shops (shop_id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT ''
);

-- Stable dev listing referenced by Etsy tutorial–style uploads: shops/1/listings/{id}/images
INSERT INTO faketsy_listings (listing_id, shop_id, title) VALUES (910001001, 1, 'Dev draft listing')
ON CONFLICT (listing_id) DO NOTHING;

CREATE TABLE faketsy_listing_images (
    listing_image_id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES faketsy_listings (listing_id) ON DELETE CASCADE,
    shop_id BIGINT NOT NULL REFERENCES faketsy_shops (shop_id) ON DELETE CASCADE,
    rank INT NOT NULL,
    mime_type TEXT NOT NULL,
    bytes_size BIGINT NOT NULL,
    original_filename TEXT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (listing_id, rank)
);
