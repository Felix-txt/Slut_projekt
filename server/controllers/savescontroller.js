const db = require(`../config/database`);

const saveGameData = async (req, res) => {
    try {
        const userId = req.userId;
        const {gameId} = req.body;
        const incomingSnapshot = req.body.snapshot || req.body.saveData;

        if (!gameId) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `gameId required`
            });
        }

        if (!incomingSnapshot || typeof incomingSnapshot !== `object` || Array.isArray(incomingSnapshot)) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `snapshot must be a JSON object`
            });
        }

        const snapshot = {
            ...incomingSnapshot,
            savedAt: incomingSnapshot.savedAt || Math.floor(Date.now() / 1000)
        };

        const result = await db.query(
            `INSERT INTO saves (user_id, game_id, save_data)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, game_id)
             DO UPDATE SET
                save_data = $3,
                version = saves.version + 1,
                updated_at = CURRENT_TIMESTAMP
             RETURNING id, version, updated_at`,
            [userId, gameId, snapshot]
        );

        res.json({
            ok: true,
            saveId: result.rows[0].id,
            version: result.rows[0].version,
            savedAt: snapshot.savedAt,
            updatedAt: result.rows[0].updated_at
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

const loadGameData = async (req, res) => {
    try {
        const userId = req.userId;
        const {gameId} = req.params;

        const result = await db.query(
            `SELECT save_data, version, updated_at FROM saves WHERE user_id = $1 AND game_id = $2`,
            [userId, gameId]
        );

        if (result.rows.length === 0) {
            return res.json({
                ok: true,
                snapshot: null
            });
        }

        res.json({
            ok: true,
            snapshot: result.rows[0].save_data,
            version: result.rows[0].version,
            updatedAt: result.rows[0].updated_at
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

const loadPublicGameData = async (req, res) => {
    try {
        const accountId = Number(req.params.accountId);
        const {gameId} = req.params;

        if (!Number.isInteger(accountId) || accountId <= 0) {
            return res.status(400).json({
                ok: false,
                errorType: `validation`,
                errorMessage: `invalid account id`
            });
        }

        const result = await db.query(
            `SELECT save_data, version, updated_at FROM saves WHERE user_id = $1 AND game_id = $2`,
            [accountId, gameId]
        );

        if (result.rows.length === 0) {
            return res.json({
                ok: true,
                snapshot: null
            });
        }

        res.json({
            ok: true,
            snapshot: result.rows[0].save_data,
            version: result.rows[0].version,
            updatedAt: result.rows[0].updated_at
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            ok: false,
            errorType: `server`,
            errorMessage: `server error`
        });
    }
};

module.exports = {saveGameData, loadGameData, loadPublicGameData};
