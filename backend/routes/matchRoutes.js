const express = require('express');
const router = express.Router();

const {
  createMatchRoom,
  joinMatchRoom,
  submitAnswer
} = require('../controllers/matchController');

const { getLeaderboard } = require('../controllers/leaderboardController'); // Correct import
const verifyFirebaseToken = require('../middleware/authMiddleware');

// Protected routes
router.post('/create', verifyFirebaseToken, createMatchRoom);
router.post('/join', verifyFirebaseToken, joinMatchRoom);
router.post('/answer', verifyFirebaseToken, submitAnswer);
router.get('/leaderboard/:roomId', verifyFirebaseToken, getLeaderboard);

module.exports = router;
