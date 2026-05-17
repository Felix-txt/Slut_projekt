const express = require(`express`);
const router = express.Router();
const {verifyAdmin} = require(`../middleware/auth`);
const {getUsers, updateUserAdminStatus, deleteUser, uploadGameFileMiddleware, uploadGameFile} = require(`../controllers/admincontroller`);

router.get(`/users`, verifyAdmin, getUsers); // hämtar alla användare
router.patch(`/users/:id/admin`, verifyAdmin, updateUserAdminStatus); // uppdaterar en användares adminstatus
router.delete(`/users/:id`, verifyAdmin, deleteUser); // tar bort en användare
router.post(`/upload`, verifyAdmin, uploadGameFileMiddleware, uploadGameFile); // laddar upp en ny spelbuild

module.exports = router; // exporterar routern så att den kan användas i server.js
