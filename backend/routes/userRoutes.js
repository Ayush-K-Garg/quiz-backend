// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyFirebaseToken = require('../middleware/authMiddleware');

router.get('/search', verifyFirebaseToken, userController.searchUsers);
router.get('/suggested', verifyFirebaseToken, userController.getSuggestedUsers);

module.exports = router;
