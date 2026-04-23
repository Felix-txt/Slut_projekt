const db = require(`../config/database`);

const getAllGames = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, title, description, download_url, version FROM games WHERE published = true`
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

module.exports = {getAllGames, getGame};
