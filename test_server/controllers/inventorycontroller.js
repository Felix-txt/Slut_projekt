const db = require(`../config/database`);

const getInventory = async (req, res) => {
    try {
        const userId = req.userId;
        
        const result = await db.query(`
            SELECT ui.id, ui.rarity, ui.wear, ui.float_value, ui.stattrak, ui.souvenir, ui.pattern_id, ui.obtained_at,
                   s.name, s.weapon_type, s.image_url, s.min_price, s.max_price
            FROM user_inventory ui
            JOIN skins s ON ui.skin_id = s.id
            WHERE ui.user_id = $1 AND ui.is_in_trade = false
            ORDER BY ui.obtained_at DESC
        `, [userId]);
        
        res.json({inventory: result.rows});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const getBalance = async (req, res) => {
    try {
        const userId = req.userId;
        
        const result = await db.query(`
            SELECT balance, total_earned, total_spent FROM user_balance WHERE user_id = $1
        `, [userId]);
        
        if (result.rows.length === 0) {
            await db.query(`
                INSERT INTO user_balance (user_id, balance) VALUES ($1, 100.00)
            `, [userId]);
            return res.json({balance: 100.00, total_earned: 0, total_spent: 0});
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const sellItem = async (req, res) => {
    try {
        const userId = req.userId;
        const {itemId} = req.body;
        
        if (!itemId) {
            return res.status(400).json({message: `itemId required`});
        }
        
        const itemResult = await db.query(`
            SELECT ui.id, ui.skin_id, s.min_price
            FROM user_inventory ui
            JOIN skins s ON ui.skin_id = s.id
            WHERE ui.id = $1 AND ui.user_id = $2 AND ui.is_in_trade = false
        `, [itemId, userId]);
        
        if (itemResult.rows.length === 0) {
            return res.status(404).json({message: `item not found`});
        }
        
        const item = itemResult.rows[0];
        const sellPrice = Math.floor(parseFloat(item.min_price) * 0.8 + 0.5);
        
        const client = await db.connect();
        try {
            await client.query(`BEGIN`);
            
            await client.query(`DELETE FROM user_inventory WHERE id = $1`, [itemId]);
            
            await client.query(`
                UPDATE user_balance SET 
                    balance = balance + $1,
                    total_earned = total_earned + $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
            `, [sellPrice, userId]);
            
            await client.query(`COMMIT`);
            
            res.json({message: `item sold`, amount: sellPrice});
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

const addBalance = async (req, res) => {
    try {
        const userId = req.userId;
        const {amount} = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({message: `valid amount required`});
        }
        
        const result = await db.query(`
            UPDATE user_balance SET 
                balance = balance + $1,
                total_earned = total_earned + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2
            RETURNING balance
        `, [amount, userId]);
        
        if (result.rows.length === 0) {
            const newResult = await db.query(`
                INSERT INTO user_balance (user_id, balance, total_earned) VALUES ($1, $2, $2)
                RETURNING balance
            `, [userId, amount]);
            return res.json({balance: parseFloat(newResult.rows[0].balance)});
        }
        
        res.json({balance: parseFloat(result.rows[0].balance)});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

module.exports = {getInventory, getBalance, sellItem, addBalance};