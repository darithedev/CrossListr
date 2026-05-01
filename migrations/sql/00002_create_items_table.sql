CREATE TABLE items ( 
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(80) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    condition VARCHAR(20),
    price NUMERIC(10,2),
    item_images TEXT[] NOT NULL DEFAULT '{}',
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    external_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);