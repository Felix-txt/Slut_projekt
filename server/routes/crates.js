const express = require(`express`);
const router = express.Router();
const { verifyToken } = require(`../middleware/auth.js`);
const CratesController = require(`../controllers/cratescontroller.js`);

router.get(`/`, CratesController.getAllCrates); // route för att hämta alla crates, kräver inte autentisering
router.get(`/:id`, CratesController.getCrateById); // route för att hämta en crate baserat på id, kräver inte autentisering
router.post(`/open`, verifyToken, CratesController.openCrate); // route för att öppna en crate, kräver autentisering
router.post(`/`, verifyToken, CratesController.addCrate); // route för att lägga till en crate, kräver autentisering (kan användas av admin för att lägga till crates i systemet)

module.exports = router;