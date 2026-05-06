const express = require(`express`);
const router = express.Router();
const {verifyAdmin} = require(`../middleware/auth`);
const {getUsers, updateUserAdminStatus, deleteUser} = require(`../controllers/admincontroller`);

router.get(`/users`, verifyAdmin, getUsers);
router.patch(`/users/:id/admin`, verifyAdmin, updateUserAdminStatus);
router.delete(`/users/:id`, verifyAdmin, deleteUser);

module.exports = router;
