const express = require(`express`);
const router = express.Router();
const { verifyToken } = require(`../middleware/auth.js`);
const InventoryController = require(`../controllers/inventorycontroller.js`);

router.get(`/`, verifyToken, InventoryController.getInventory); // route för att hämta en användares inventory, kräver autentisering
router.get(`/balance`, verifyToken, InventoryController.getBalance); // route för att hämta en användares balans, kräver autentisering
router.post(`/sell`, verifyToken, InventoryController.sellItem); // route för att sälja ett item, kräver autentisering
router.post(`/balance`, verifyToken, InventoryController.addBalance); // route för att lägga till balans, kräver autentisering

module.exports = router;