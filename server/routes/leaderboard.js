const express = require(`express`);
const router = express.Router();
const {getLeaderboard} = require(`../controllers/leaderboardcontroller`);

router.get(`/`, getLeaderboard); // route för att hämta leaderboardinformation

module.exports = router;
