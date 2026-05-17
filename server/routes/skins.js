const express = require(`express`);
const router = express.Router();
const { verifyToken } = require(`../middleware/auth.js`);
const SkinsController = require(`../controllers/skinscontroller.js`);

router.get(`/`, SkinsController.getAllSkins); // route för att hämta alla skins, kräver inte autentisering
router.get(`/:id`, SkinsController.getSkinById); // route för att hämta ett skin baserat på id, kräver inte autentisering
router.post(`/`, verifyToken, SkinsController.addSkin); // route för att lägga till ett nytt skin, kräver autentisering

module.exports = router;