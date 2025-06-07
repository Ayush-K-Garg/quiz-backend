const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const verifyFirebaseToken = require('../middleware/authMiddleware');

// Get leaderboard for a match room
router.get('/:roomId', verifyFirebaseToken, leaderboardController.getLeaderboard);

// Optional: Submit/update user score in match room
router.post('/:roomId/submit', verifyFirebaseToken, leaderboardController.submitScore);

module.exports = router;
