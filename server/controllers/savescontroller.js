const db = require(`../config/database`);

const saveGameData = async (req, res) => {
    try {
        const userId = req.userId;
        const {gameId, saveData} = req.body;

        if (!gameId || !saveData) {
            return res.status(400).json({message: `gameId and saveData required`});
        }

        const result = await db.query(
            `INSERT INTO saves (user_id, game_id, save_data) VALUES ($1, $2, $3) ON CONFLICT (user_id, game_id) DO UPDATE SET save_data = $3, updated_at = CURRENT_TIMESTAMP RETURNING id`,
            [userId, gameId, saveData]
        );

        res.json({message: `game saved successfully`, saveId: result.rows[0].id});

    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const loadGameData = async (req, res) => {
    try {
        const userId = req.userId;
        const {gameId} = req.params;

        const result = await db.query(
            `SELECT save_data FROM saves WHERE user_id = $1 AND game_id = $2`,
            [userId, gameId]
        );

        if (result.rows.length === 0) {
            return res.json({message: `no saves found`, saveData: null});
        }

        res.json({saveData: result.rows[0].save_data});

    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

module.exports = {saveGameData, loadGameData};
