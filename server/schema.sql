-- ============================================================================
-- CSGO Clicker Game Database Schema
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    download_url VARCHAR(500),
    version VARCHAR(50),
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- User open crate history
CREATE TABLE IF NOT EXISTS crate_opens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    crate_id INTEGER REFERENCES crates(id),
    skin_id INTEGER REFERENCES skins(id),
    rarity VARCHAR(100),
    price_at_open DECIMAL(10, 2),
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
CREATE INDEX IF NOT EXISTS idx_saves_user_game ON saves(user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_saves_save_data_gin ON saves USING GIN (save_data);
