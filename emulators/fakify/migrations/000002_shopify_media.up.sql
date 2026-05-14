-- Shopify-shaped media pipeline: staged upload placeholder + persisted file rows (see CONTRACT.md).

CREATE TABLE fakify_staged_upload (
    token TEXT PRIMARY KEY,
    filename TEXT NOT NULL DEFAULT 'upload.bin',
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded')),
    bytes_size BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE TABLE fakify_media_file (
    id BIGSERIAL PRIMARY KEY,
    gid TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    bytes_size BIGINT NOT NULL,
    relative_path TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
