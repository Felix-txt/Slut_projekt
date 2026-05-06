const db = require(`../config/database`);

const getUsers = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                u.id,
                u.username,
                u.email,
                u.is_admin,
                u.created_at,
                COALESCE(b.balance, 0) AS balance
             FROM users u
             LEFT JOIN user_balance b ON b.user_id = u.id
             ORDER BY u.created_at DESC, u.id DESC`
        );

        res.json({
            ok: true,
            users: result.rows.map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.is_admin,
                createdAt: user.created_at,
                balance: Number(user.balance)
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

module.exports = {getUsers};
