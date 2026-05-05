const db = require(`../config/database`);

const getAllCrates = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, display_name, description, key_name, price, image_url, is_available
            FROM crates WHERE is_available = true ORDER BY name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const getCrateById = async (req, res) => {
    try {
        const {id} = req.params;
        
        const crateResult = await db.query(`SELECT * FROM crates WHERE id = $1`, [id]);
        if (crateResult.rows.length === 0) {
            return res.status(404).json({message: `crate not found`});
        }
        
        const skinsResult = await db.query(`
            SELECT s.id, s.name, s.weapon_type, s.rarity, s.min_price, s.max_price, cs.weight
            FROM crate_skins cs
            JOIN skins s ON cs.skin_id = s.id
            WHERE cs.crate_id = $1
            ORDER BY cs.rarity, s.name
        `, [id]);
        
        res.json({
            ...crateResult.rows[0],
            skins: skinsResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const openCrate = async (req, res) => {
    try {
        const userId = req.userId;
        const {crateId} = req.body;
        
        if (!crateId) {
            return res.status(400).json({message: `crateId required`});
        }
        
        const crateResult = await db.query(`SELECT * FROM crates WHERE id = $1 AND is_available = true`, [crateId]);
        if (crateResult.rows.length === 0) {
            return res.status(404).json({message: `crate not found`});
        }
        
        const crate = crateResult.rows[0];
        
        const balanceResult = await db.query(`SELECT balance FROM user_balance WHERE user_id = $1`, [userId]);
        const balance = balanceResult.rows.length > 0 ? parseFloat(balanceResult.rows[0].balance) : 0;
        
        if (balance < parseFloat(crate.price)) {
            return res.status(400).json({message: `insufficient balance`});
        }
        
        const crateSkinsResult = await db.query(`
            SELECT s.*, cs.weight FROM crate_skins cs
            JOIN skins s ON cs.skin_id = s.id
            WHERE cs.crate_id = $1
        `, [crateId]);
        
        if (crateSkinsResult.rows.length === 0) {
            return res.status(400).json({message: `crate is empty`});
        }
        
        const totalWeight = crateSkinsResult.rows.reduce((sum, s) => sum + (s.weight || 1), 0);
        let random = Math.random() * totalWeight;
        let selectedSkin = null;
        
        for (const skin of crateSkinsResult.rows) {
            random -= (skin.weight || 1);
            if (random <= 0) {
                selectedSkin = skin;
                break;
            }
        }
        
        if (!selectedSkin) {
            selectedSkin = crateSkinsResult.rows[Math.floor(Math.random() * crateSkinsResult.rows.length)];
        }
        
        const client = await db.connect();
        try {
            await client.query(`BEGIN`);
            
            await client.query(`
                UPDATE user_balance SET 
                    balance = balance - $1,
                    total_spent = total_spent + $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
            `, [crate.price, userId]);
            
            const inventoryResult = await client.query(`
                INSERT INTO user_inventory (user_id, skin_id, rarity, stattrak, souvenir)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [userId, selectedSkin.id, selectedSkin.rarity, Math.random() > 0.5, selectedSkin.is_souvenir || false]);
            
            await client.query(`
                INSERT INTO crate_opens (user_id, crate_id, skin_id, rarity, price_at_open)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, crateId, selectedSkin.id, selectedSkin.rarity, selectedSkin.min_price]);
            
            await client.query(`COMMIT`);
            
            res.json({
                message: `crate opened`,
                item: {
                    id: selectedSkin.id,
                    name: selectedSkin.name,
                    rarity: selectedSkin.rarity,
                    weapon_type: selectedSkin.weapon_type,
                    price: selectedSkin.min_price
                },
                newBalance: balance - crate.price
            });
        } catch (err) {
            await client.query(`ROLLBACK`);
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const addCrate = async (req, res) => {
    try {
        const {name, display_name, description, key_name, price, image_url, is_available} = req.body;
        
        if (!name) {
            return res.status(400).json({message: `name required`});
        }
        
        const result = await db.query(`
            INSERT INTO crates (name, display_name, description, key_name, price, image_url, is_available)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name
        `, [name, display_name || name, description, key_name, price || 0, image_url, is_available !== false]);
        
        res.status(201).json({message: `crate created`, crate: result.rows[0]});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

module.exports = {getAllCrates, getCrateById, openCrate, addCrate};