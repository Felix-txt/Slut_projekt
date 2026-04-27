const express = require(`express`);
const router = express.Router();
const verifyToken = require(`../middleware/auth.js`);
const InventoryController = require(`../controllers/inventorycontroller.js`);

router.get(`/`, verifyToken, InventoryController.getInventory);
router.get(`/balance`, verifyToken, InventoryController.getBalance);
router.post(`/sell`, verifyToken, InventoryController.sellItem);
router.post(`/balance`, verifyToken, InventoryController.addBalance);

module.exports = router;