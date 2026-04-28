const express = require(`express`);
const router = express.Router();
const {verifyToken, verifyAdmin} = require(`../middleware/auth.js`);
const { getAllGames, getGame, createGame, updateGame, deleteGame } = require(`../controllers/gamescontroller.js`);

router.get(`/all`, getAllGames);
router.get(`/:id`, getGame);
router.post(`/create`, verifyAdmin, createGame);
router.put(`/:id`, verifyAdmin, updateGame);
router.delete(`/:id`, verifyAdmin, deleteGame);

module.exports = router;
