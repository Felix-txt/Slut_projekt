const db = require(`../config/database`);

const getAllSkins = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, weapon_type, rarity, image_url, min_price, max_price, is_stattrak, is_souvenir
            FROM skins ORDER BY rarity, name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const getSkinById = async (req, res) => {
    try {
        const {id} = req.params;
        const result = await db.query(`SELECT * FROM skins WHERE id = $1`, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({message: `skin not found`});
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const addSkin = async (req, res) => {
    try {
        const {name, weapon_type, rarity, image_url, min_price, max_price, is_stattrak, is_souvenir} = req.body;
        
        if (!name || !rarity) {
            return res.status(400).json({message: `name and rarity required`});
        }
        
        const result = await db.query(`
            INSERT INTO skins (name, weapon_type, rarity, image_url, min_price, max_price, is_stattrak, is_souvenir)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name
        `, [name, weapon_type, rarity, image_url, min_price || 0, max_price || 0, is_stattrak !== false, is_souvenir || false]);
        
        res.status(201).json({message: `skin created`, skin: result.rows[0]});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

module.exports = {getAllSkins, getSkinById, addSkin};