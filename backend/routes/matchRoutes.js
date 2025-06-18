const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const verifyFirebaseToken = require('../middleware/authMiddleware');

const {
  createMatchRoom,
  joinMatchRoom,
  submitAnswer,
  findOrCreateRandomMatch,
  startCustomMatch,
  getLeaderboard,
  getMatchStatus,
  getMatchQuestions, // ✅ Newly added
  submitAnswersBulk,
  getMatchRoomDebug,

} = matchController;

// 🔐 Protected Match Routes (requires Firebase Auth)
router.post('/create', verifyFirebaseToken, createMatchRoom);
router.post('/join', verifyFirebaseToken, joinMatchRoom);
router.post('/random', verifyFirebaseToken, findOrCreateRandomMatch);
router.post('/start', verifyFirebaseToken, startCustomMatch);
router.post('/answer', verifyFirebaseToken, submitAnswer);
router.post('/answer-bulk', verifyFirebaseToken, submitAnswersBulk);
router.get('/leaderboard/:roomId', verifyFirebaseToken, getLeaderboard);
router.get('/status/:roomId', verifyFirebaseToken, getMatchStatus);
router.get('/questions', verifyFirebaseToken, getMatchQuestions); // ✅ Fix route
router.get('/debug-room/:roomId', verifyFirebaseToken, getMatchRoomDebug);

// Example: /api/match/questions?roomId=RL2BNT

module.exports = router;
