CREATE TABLE IF NOT EXISTS emulator_meta (
    id   serial PRIMARY KEY,
    slug text NOT NULL UNIQUE
);

INSERT INTO emulator_meta (slug) VALUES ('fakesty')
    ON CONFLICT (slug) DO NOTHING;
