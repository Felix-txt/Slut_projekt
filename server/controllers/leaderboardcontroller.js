const db = require(`../config/database`);

const SORT_FIELDS = {
    money: `(s.save_data->>'money')::numeric`,
    level: `(s.save_data->>'level')::numeric`,
    casesOpened: `((s.save_data->'stats')->>'totalCasesOpened')::numeric`,
    inventoryCount: `(s.save_data->>'inventoryCount')::numeric`
};

const getLeaderboard = async (req, res) => {
    try {
        const sort = SORT_FIELDS[req.query.sort] ? req.query.sort : `money`;
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
        const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
        const gameId = req.query.gameId || `case-clicker`;

        const sortExpression = SORT_FIELDS[sort];
        const result = await db.query(
            `SELECT
                u.id AS account_id,
                u.username,
                COALESCE((s.save_data->>'level')::numeric, 0) AS level,
                COALESCE((s.save_data->>'money')::numeric, 0) AS money,
                COALESCE(((s.save_data->'stats')->>'totalCasesOpened')::numeric, 0) AS total_cases_opened,
                COALESCE((s.save_data->>'inventoryCount')::numeric, 0) AS inventory_count,
                s.updated_at
             FROM saves s
             JOIN users u ON u.id = s.user_id
             WHERE s.game_id = $1
             ORDER BY COALESCE(${sortExpression}, 0) DESC, s.updated_at DESC, u.id ASC
             LIMIT $2 OFFSET $3`,
            [gameId, limit, offset]
        );

        res.json({
            ok: true,
            sort,
            limit,
            offset,
            rows: result.rows.map((row, index) => ({
                rank: offset + index + 1,
                accountId: row.account_id,
                username: row.username,
                level: Number(row.level),
                money: Number(row.money),
                totalCasesOpened: Number(row.total_cases_opened),
                inventoryCount: Number(row.inventory_count),
                updatedAt: row.updated_at
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

module.exports = {getLeaderboard};
