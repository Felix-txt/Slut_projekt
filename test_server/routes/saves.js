const express = require(`express`);
const router = express.Router();
const verifyToken = require(`../middleware/auth.js`);
const { saveGameData, loadGameData } = require(`../controllers/savescontroller.js`);

router.post(`/save`, verifyToken, saveGameData);
router.get(`/load/:gameId`, verifyToken, loadGameData);

module.exports = router;
