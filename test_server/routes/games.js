const express = require(`express`);
const router = express.Router();
const { getAllGames, getGame } = require(`../controllers/gamescontroller.js`);

router.get(`/all`, getAllGames);
router.get(`/:id`, getGame);

module.exports = router;
