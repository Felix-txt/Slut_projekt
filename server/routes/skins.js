const express = require(`express`);
const router = express.Router();
const { verifyToken } = require(`../middleware/auth.js`);
const SkinsController = require(`../controllers/skinscontroller.js`);

router.get(`/`, SkinsController.getAllSkins);
router.get(`/:id`, SkinsController.getSkinById);
router.post(`/`, verifyToken, SkinsController.addSkin);

module.exports = router;