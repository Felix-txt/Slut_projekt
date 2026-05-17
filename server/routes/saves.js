const express = require(`express`);
const router = express.Router();
const { verifyToken } = require(`../middleware/auth.js`);
const { saveGameData, loadGameData, loadPublicGameData } = require(`../controllers/savescontroller.js`);


router.post(`/save`, verifyToken, saveGameData); // route för att spara speldata, kräver autentisering
router.get(`/public/:accountId/:gameId`, loadPublicGameData); // route för att hämta offentlig speldata baserat på konto- och spel-ID
router.get(`/load/:gameId`, verifyToken, loadGameData); // route för att hämta sparad speldata, kräver autentisering

module.exports = router;
