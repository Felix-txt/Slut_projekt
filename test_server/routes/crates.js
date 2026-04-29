const express = require(`express`);
const router = express.Router();
const { verifyToken } = require(`../middleware/auth.js`);
const CratesController = require(`../controllers/cratescontroller.js`);

router.get(`/`, CratesController.getAllCrates);
router.get(`/:id`, CratesController.getCrateById);
router.post(`/open`, verifyToken, CratesController.openCrate);
router.post(`/`, verifyToken, CratesController.addCrate);

module.exports = router;