const express = require(`express`);
const router = express.Router();
const {verifyToken, verifyAdmin} = require(`../middleware/auth.js`);
const { getAllGames, getGame, createGame, updateGame, deleteGame } = require(`../controllers/gamescontroller.js`);

router.get(`/all`, getAllGames); // route för att hämta alla spel, kräver inte autentisering
router.get(`/:id`, getGame); // route för att hämta ett specifikt spel, kräver inte autentisering
router.post(`/create`, verifyAdmin, createGame); // route för att skapa ett nytt spel, kräver admin-autentisering
router.put(`/:id`, verifyAdmin, updateGame); // route för att uppdatera ett spel, kräver admin-autentisering
router.delete(`/:id`, verifyAdmin, deleteGame); // route för att ta bort ett spel, kräver admin-autentisering

module.exports = router;
