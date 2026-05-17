const express = require(`express`);
const router = express.Router();
const {verifyAdmin} = require(`../middleware/auth`);
const {getUsers, updateUserAdminStatus, deleteUser} = require(`../controllers/admincontroller`);

router.get(`/users`, verifyAdmin, getUsers); // hämtar alla användare
router.patch(`/users/:id/admin`, verifyAdmin, updateUserAdminStatus); // uppdaterar en användares adminstatus
router.delete(`/users/:id`, verifyAdmin, deleteUser); // tar bort en användare

module.exports = router; // exporterar routern så att den kan användas i server.js
