const express = require(`express`);
const router = express.Router();
const {getLeaderboard} = require(`../controllers/leaderboardcontroller`);

router.get(`/`, getLeaderboard);

module.exports = router;
