const express = require(`express`);
const router = express.Router();
const {verifyAdmin} = require(`../middleware/auth`);
const {getUsers} = require(`../controllers/admincontroller`);

router.get(`/users`, verifyAdmin, getUsers);

module.exports = router;
