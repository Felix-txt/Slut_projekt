const express = require('express');
const router = express.Router();
const db = require('../config/database');
const {verifyToken} = require('../middleware/auth');


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

        res.json({ok: true, user: result.rows[0]});

    }
    catch(error){
        console.error(error);
        res.status(500).json({ok: false, errorMessage: 'server error'})
    }
});

module.exports = router; 