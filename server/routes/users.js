const express = require('express');
const router = express.Router();
const db = require('../config/database');
const {verifyToken} = require('../middleware/auth');

const PUBLIC_GAME_ID = 'case-clicker';

function serializePrivateUser(row) {
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        is_admin: row.is_admin,
        profile_picture: row.profile_picture,
        created_at: row.created_at
    };
}

function serializePublicUser(row) {
    return {
        id: row.id,
        username: row.username,
        profile_picture: row.profile_picture,
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

router.get('/me', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, username, email, is_admin, profile_picture, created_at
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

router.get('/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ok: false, errorMessage: 'invalid account id'});
        }

        const result = await db.query(
            `SELECT
                u.id,
                u.username,
                u.profile_picture,
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

        res.json({ok: true, user: serializePublicUser(result.rows[0])});
    } catch (error) {
        console.error(error);
        res.status(500).json({ok: false, errorMessage: 'server error'});
    }
});


router.put('/update', verifyToken, async (req, res) => {
    try{
        const {username, email, profile_picture} = req.body;
        const userId = req.userId;

        if(!username && !email && profile_picture === undefined) {
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
        if (profile_picture !== undefined) {
            fields.push(`profile_picture = $${idx++}`);
            values.push(profile_picture);
        }
        values.push(userId);

        const result = await db.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, email, profile_picture`, values
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

module.exports = router; 
