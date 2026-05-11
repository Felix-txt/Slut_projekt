const db = require(`../config/database`);
const {ROOT_ADMIN_EMAIL} = require(`../config/rootAdmin`);
const PUBLIC_GAME_ID = `case-clicker`;

const getUsers = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                u.id,
                u.username,
                u.email,
                u.is_admin,
                u.created_at,
                COALESCE((s.save_data->>'level')::numeric, 0) AS level
             FROM users u
             LEFT JOIN saves s ON s.user_id = u.id AND s.game_id = $1
             ORDER BY u.created_at DESC, u.id DESC`
            ,
            [PUBLIC_GAME_ID]
        );

        res.json({
            ok: true,
            users: result.rows.map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin,
                createdAt: user.created_at,
                level: Number(user.level || 0)
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

const updateUserAdminStatus = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const {isAdmin} = req.body;

        if (!Number.isInteger(userId)) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `invalid user id`
            });
        }

        if (typeof isAdmin !== `boolean`) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `isAdmin must be true or false`
            });
        }

        const protectedUser = await db.query(`SELECT email FROM users WHERE id = $1`, [userId]);
        if (protectedUser.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `user not found`
            });
        }

        if (protectedUser.rows[0].email.toLowerCase() === ROOT_ADMIN_EMAIL) {
            return res.status(403).json({
                ok: false,
                errorType: `auth`,
                errorMessage: `root admin cannot be changed`
            });
        }

        if (userId === req.userId && !isAdmin) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `you cannot remove admin from your own account`
            });
        }

        const result = await db.query(
            `UPDATE users
             SET is_admin = $1
             WHERE id = $2
             RETURNING id, username, email, is_admin`,
            [isAdmin, userId]
        );

        const user = result.rows[0];
        res.json({
            ok: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId)) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `invalid user id`
            });
        }

        if (userId === req.userId) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `you cannot delete your own account`
            });
        }

        const protectedUser = await db.query(`SELECT email FROM users WHERE id = $1`, [userId]);
        if (protectedUser.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `user not found`
            });
        }

        if (protectedUser.rows[0].email.toLowerCase() === ROOT_ADMIN_EMAIL) {
            return res.status(403).json({
                ok: false,
                errorType: `auth`,
                errorMessage: `root admin cannot be deleted`
            });
        }

        const result = await db.query(
            `DELETE FROM users
             WHERE id = $1
             RETURNING id, username, email`,
            [userId]
        );

        res.json({
            ok: true,
            deletedUser: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

module.exports = {getUsers, updateUserAdminStatus, deleteUser};
