
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
CREATE TABLE IF NOT EXISTS skins ( -- skapar en tabell som heter skins
    id SERIAL PRIMARY KEY, -- id är unikt nummer för varje skin, SERIAL räknas upp automatiskt och primary key betyder att det är den unika identifieraren för tabellen
    name VARCHAR(255) NOT NULL UNIQUE, -- name är namnet på skinet, varchar betyder att den kan vara upp till 255 tecken lång, not null betyder att den inte får vara tom, unique betyder att varje skin måste ha ett unikt namn
    weapon_type VARCHAR(100),  -- weapon_type är typen av vapen som skinet tillhör, varchar betyder att den kan vara upp till 100 tecken lång
    rarity VARCHAR(100), -- rarity är sällsyntheten av skinet, varchar betyder att den kan vara upp till 100 tecken lång
    image_url VARCHAR(500), -- url till skinets bild, varchar betyder att den kan vara upp till 500 tecken lång
    min_price DECIMAL(10, 2) DEFAULT 0, -- min_price är det lägsta priset för skinet, decimal betyder att det är ett tal med decimaler, 10 är det totala antalet siffror och 2 är antalet decimaler, default 0 betyder att det automatiskt sätts till 0 om inget annat värde anges
    max_price DECIMAL(10, 2) DEFAULT 0, -- max_price är det högsta priset för skinet, decimal betyder att det är ett tal med decimaler, 10 är det totala antalet siffror och 2 är antalet decimaler, default 0 betyder att det automatiskt sätts till 0 om inget annat värde anges
    is_stattrak BOOLEAN DEFAULT TRUE, -- is_stattrak är om skinet har stattrak eller inte, boolean betyder att det kan vara sant eller falskt, default true betyder att det automatiskt sätts till sant om inget annat värde anges
    is_souvenir BOOLEAN DEFAULT FALSE, -- is_souvenir är om skinet är en souvenir eller inte, boolean betyder att det kan vara sant eller falskt, default false betyder att det automatiskt sätts till falskt om inget annat värde anges
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- när skinet skapades, timestamp betyder att det är ett datum och tid, default current_timestamp betyder att det automatiskt sätts till den tidpunkt då raden skapas
);

-- Crates table
CREATE TABLE IF NOT EXISTS crates ( -- skapar en tabell som heter crates
    id SERIAL PRIMARY KEY, -- id är unikt nummer för varje crate, SERIAL räknas upp automatiskt och primary key betyder att det är den unika identifieraren för tabellen
    name VARCHAR(255) NOT NULL UNIQUE, -- name är namnet på crate, varchar betyder att den kan vara upp till 255 tecken lång, not null betyder att den inte får vara tom, unique betyder att varje crate måste ha ett unikt namn
    display_name VARCHAR(255), -- display_name är det namn som visas för crate, varchar betyder att den kan vara upp till 255 tecken lång
    description TEXT, -- besrkivning av crate, text betyder att det kan vara en längre text
    key_name VARCHAR(255), -- key_name är namnet på nyckeln som krävs för att öppna crate, varchar betyder att den kan vara upp till 255 tecken lång
    price DECIMAL(10, 2) DEFAULT 0, -- price är priset för att öppna crate, decimal betyder att det är ett tal med decimaler, 10 är det totala antalet siffror och 2 är antalet decimaler, default 0 betyder att det automatiskt sätts till 0 om inget annat värde anges
    image_url VARCHAR(500), -- url till crate's bild, varchar betyder att den kan vara upp till 500 tecken lång
    is_available BOOLEAN DEFAULT TRUE, -- is_available är om crate är tillgänglig eller inte, boolean betyder att det kan vara sant eller falskt, default true betyder att det automatiskt sätts till sant om inget annat värde anges
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- när crate skapades, timestamp betyder att det är ett datum och tid, default current_timestamp betyder att det automatiskt sätts till den tidpunkt då raden skapas
);

-- Crate skins (which skins are in which crate)
CREATE TABLE IF NOT EXISTS crate_skins (  -- skapar en tabell som heter crate_skins
    id SERIAL PRIMARY KEY, -- id är unikt nummer för varje rad i crate_skins, SERIAL räknas upp automatiskt och primary key betyder att det är den unika identifieraren för tabellen
    crate_id INTEGER REFERENCES crates(id) ON DELETE CASCADE, -- crate_id är id för crate som skinet tillhör, integer betyder att det är ett heltal, references crates(id) betyder att det refererar till id i crates tabellen, on delete cascade betyder att om en crate tas bort så tas alla rader i crate_skins som refererar till den craten också bort
    skin_id INTEGER REFERENCES skins(id) ON DELETE CASCADE, -- skin_id är id för skinet som tillhör crate, integer betyder att det är ett heltal, references skins(id) betyder att det refererar till id i skins tabellen, on delete cascade betyder att om ett skin tas bort så tas alla rader i crate_skins som refererar till det skinet också bort
    rarity VARCHAR(100), -- rarity är sällsyntheten av skinet i crate, varchar betyder att den kan vara upp till 100 tecken lång
    weight DECIMAL(10, 4) DEFAULT 1.0, -- weight är sannolikheten att få skin
    UNIQUE(crate_id, skin_id) -- varje skin kan bara finnas en gång i varje crate
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
