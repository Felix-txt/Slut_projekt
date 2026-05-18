const db = require(`../config/database`);

const getAllGames = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, title, description, download_url, version
             FROM games
             WHERE published = true
             ORDER BY created_at DESC, id DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const getGame = async (req, res) => {
    try {
        const {id} = req.params;
        const result = await db.query(
            `SELECT * FROM games WHERE id = $1 AND published = true`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({message: `game not found`});
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const createGame = async (req, res) => {
    try {
        const {title, description, download_url, version} = req.body;
        const result = await db.query(
            `INSERT INTO games (title, description, download_url, version, published)
             VALUES ($1, $2, $3, $4, true)
             RETURNING id`,
            [title, description, download_url, version]
        );
        res.status(201).json({ok: true, message: `game created`, gameId: result.rows[0].id});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const updateGame = async (req, res) => {
    try {
        const {id} = req.params;
        const {title, description, download_url, version, published} = req.body;
        const result = await db.query(
            `UPDATE games SET title = $1, description = $2, download_url = $3, version = $4, published = $5 WHERE id = $6`,
            [title, description, download_url, version, published, id]
        );
        res.json({message: `game updated`});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

const deleteGame = async (req, res) => {
    try {
        const {id} = req.params;
        await db.query(`DELETE FROM games WHERE id = $1`, [id]);
        res.json({message: `game deleted`});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: `server error`});
    }
};

module.exports = {getAllGames, getGame, createGame, updateGame, deleteGame};
