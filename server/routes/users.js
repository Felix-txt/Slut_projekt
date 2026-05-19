const express = require('express');
const router = express.Router();
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const {verifyToken} = require('../middleware/auth');

const PUBLIC_GAME_ID = 'case-clicker'; // konstant för att identifiera spelet när vi hämtar användarens spardata

function serializePrivateUser(row) { // serialiserar användardata för att skicka till klienten, inkluderar mer information än public versionen
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        is_admin: row.is_admin,
        created_at: row.created_at
    };
}

function serializePublicUser(row) { // serialiserar användardata för att skicka till klienten, inkluderar mindre information än private versionen
    return {
        id: row.id,
        username: row.username,
        created_at: row.created_at,
        stats: {
            level: Number(row.level || 0),
            money: Number(row.money || 0),
            inventoryCount: Number(row.inventory_count || 0),
            totalCasesOpened: Number(row.total_cases_opened || 0),
            updatedAt: row.save_updated_at
        }
    };
}

function tryParseUserIdFromToken(req) { // försöker hämta ut användarid från token, används för att avgöra om den som gör requesten är ägaren av kontot eller inte
    try {
        const auth = req.headers.authorization;
        if (!auth) return null;
        const token = auth.split(' ')[1];
        if (!token) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return Number(decoded.accountId || decoded.userID) || null;
    } catch (e) {
        return null;
    }
}

router.get('/me', verifyToken, async (req, res) => { // route för att hämta information om det inloggade kontot, kräver autentisering
    try {
        const result = await db.query(
            `SELECT id, username, email, is_admin, created_at
             FROM users
             WHERE id = $1`,
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ok: false, errorMessage: 'account not found'});
        }

        res.json({ok: true, user: serializePrivateUser(result.rows[0])});
    } catch (error) {
        console.error(error);
        res.status(500).json({ok: false, errorMessage: 'server error'});
    }
});

router.get('/:id', async (req, res) => { // route för att hämta information om ett konto baserat på id, kräver inte autent
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ok: false, errorMessage: 'invalid account id'});
        }

        const result = await db.query(
            `SELECT
                u.id,
                u.username,
                u.email,
                u.created_at,
                COALESCE((s.save_data->>'level')::numeric, 0) AS level,
                COALESCE((s.save_data->>'money')::numeric, 0) AS money,
                COALESCE((s.save_data->>'inventoryCount')::numeric, 0) AS inventory_count,
                COALESCE(((s.save_data->'stats')->>'totalCasesOpened')::numeric, 0) AS total_cases_opened,
                s.updated_at AS save_updated_at
             FROM users u
             LEFT JOIN saves s ON s.user_id = u.id AND s.game_id = $2
             WHERE u.id = $1`,
            [userId, PUBLIC_GAME_ID]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ok: false, errorMessage: 'account not found'});
        }

        const tokenUserId = tryParseUserIdFromToken(req);
        const isOwner = tokenUserId === userId;
        const user = isOwner ? serializePrivateUser(result.rows[0]) : serializePublicUser(result.rows[0]);

        res.json({ok: true, user});
    } catch (error) {
        console.error(error);
        res.status(500).json({ok: false, errorMessage: 'server error'});
    }
});


router.put('/update', verifyToken, async (req, res) => { // route för att uppdatera information om det inloggade kontot, kräver autentisering
    try{
        const {username, email} = req.body;
        const userId = req.userId;

        if(!username && !email) {
            return res.status(400).json({ok: false, errorMessage: 'nothing updated'})
        }
        if (email){
            const existing = await db.query(
                `SELECT id FROM users WHERE email = $1 AND id != $2`, [email, userId]
            );
            if(existing.rows.length > 0){
                return res.status(400).json({ok: false, errorMessage: 'email is already in use'})
            }
        }
        const fields = [];
        const values = [];
        let idx = 1;

        if(username){
            fields.push(`username = $${idx++}`);
            values.push(username);
        }
        if(email){
            fields.push(`email = $${idx++}`);
            values.push(email);
        }
        values.push(userId);

        const result = await db.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, email`, values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ok: false, errorMessage: 'account not found'});
        }

        res.json({ok: true, user: result.rows[0]});

    }
    catch(error){
        console.error(error);
        res.status(500).json({ok: false, errorMessage: 'server error'})
    }
});

module.exports = router;  // exporterar routern så att den kan användas i server.js
