const express = require('express');
const router = express.Router();

const {
  createMatchRoom,
  joinMatchRoom,
  submitAnswer,
  findOrCreateRandomMatch,
  startCustomMatch,
  getLeaderboard,
  getMatchStatus // ✅ Match status polling
} = require('../controllers/matchController');

const verifyFirebaseToken = require('../middleware/authMiddleware');

// 🔐 Protected Match Routes (requires Firebase Auth)
router.post('/create', verifyFirebaseToken, createMatchRoom);
router.post('/join', verifyFirebaseToken, joinMatchRoom);
router.post('/random', verifyFirebaseToken, findOrCreateRandomMatch);
router.post('/start', verifyFirebaseToken, startCustomMatch);
router.post('/answer', verifyFirebaseToken, submitAnswer);
router.get('/leaderboard/:roomId', verifyFirebaseToken, getLeaderboard);
router.get('/status/:roomId', verifyFirebaseToken, getMatchStatus); // ✅ Added authentication to polling route

module.exports = router;
