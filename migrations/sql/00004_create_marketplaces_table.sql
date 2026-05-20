CREATE TABLE marketplaces (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
    created_at TIMESTAMPTZ NOW()
    updated_at TIMESTAMPTZ NOW()
);