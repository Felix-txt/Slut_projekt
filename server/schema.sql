
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- #################################################################### --

-- Games table  -- skapad av Malte
CREATE TABLE IF NOT EXISTS games ( -- skapar en tabell som heter games
    id SERIAL PRIMARY KEY, -- id är unikt nummer för varje spel, SERIAL räknas upp automatiskt och primary key betyder att det är den unika identifieraren för tabellen
    title VARCHAR(255) NOT NULL, -- title är en textsträng som inte får vara tom samt varchar betyder att den kan vara upp till 255 tecken lång
    description TEXT, -- besrkivning av spelet, text betyder att det kan vara en längre text
    genre VARCHAR(100), -- genre av spelet, varchar betyder att den kan vara upp till 100 tecken lång   
    download_url VARCHAR(500), -- url där spelet kan laddas ner, varchar betyder att den kan vara upp till 500 tecken lång
    image_url VARCHAR(500), -- url till spelets bild, varchar betyder att den kan
    version VARCHAR(50), -- version av spelet, varchar betyder att den kan vara upp till 50 tecken lång
    published BOOLEAN DEFAULT FALSE, -- om spelet är publicerat eller inte, boolean betyder att det kan vara sant eller falskt
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- när spelet skapades, timestamp betyder att det är ett datum och tid, default current_timestamp betyder att det automatiskt sätts till den tidpunkt då raden skapas
);

-- Skins table (all available weapon skins)
CREATE TABLE IF NOT EXISTS skins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    weapon_type VARCHAR(100),
    rarity VARCHAR(100),
    image_url VARCHAR(500),
    min_price DECIMAL(10, 2) DEFAULT 0,
    max_price DECIMAL(10, 2) DEFAULT 0,
    is_stattrak BOOLEAN DEFAULT TRUE,
    is_souvenir BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crates table
CREATE TABLE IF NOT EXISTS crates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    description TEXT,
    key_name VARCHAR(255),
    price DECIMAL(10, 2) DEFAULT 0,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crate skins (which skins are in which crate)
CREATE TABLE IF NOT EXISTS crate_skins (
    id SERIAL PRIMARY KEY,
    crate_id INTEGER REFERENCES crates(id) ON DELETE CASCADE,
    skin_id INTEGER REFERENCES skins(id) ON DELETE CASCADE,
    rarity VARCHAR(100),
    weight DECIMAL(10, 4) DEFAULT 1.0,
    UNIQUE(crate_id, skin_id)
);

-- User inventory (items owned by players)
CREATE TABLE IF NOT EXISTS user_inventory (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    skin_id INTEGER REFERENCES skins(id),
    crate_id INTEGER REFERENCES crates(id),
    rarity VARCHAR(100),
    wear FLOAT,
    float_value FLOAT,
    stattrak BOOLEAN DEFAULT FALSE,
    souvenir BOOLEAN DEFAULT FALSE,
    pattern_id VARCHAR(100),
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_in_trade BOOLEAN DEFAULT FALSE
);

-- User currency balance
CREATE TABLE IF NOT EXISTS user_balance (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 100.00,
    total_earned DECIMAL(15, 2) DEFAULT 0,
    total_spent DECIMAL(15, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset links
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- #################################################################### -- 

-- User open crate history   Skapad av Aron
CREATE TABLE IF NOT EXISTS crate_opens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    crate_id INTEGER REFERENCES crates(id),
    skin_id INTEGER REFERENCES skins(id),
    rarity VARCHAR(100),
    price_at_open DECIMAL(10, 2),
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--##################################################################### --

-- Full game cloud saves. The game owns this JSON shape.
CREATE TABLE IF NOT EXISTS saves (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id VARCHAR(100) NOT NULL,
    save_data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, game_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_crate_skins_crate ON crate_skins(crate_id);
CREATE INDEX IF NOT EXISTS idx_crate_opens_user ON crate_opens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_user_game ON saves(user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_saves_save_data_gin ON saves USING GIN (save_data);
