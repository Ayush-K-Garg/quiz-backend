const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyFirebaseToken = require('../middleware/authMiddleware');

// Get current user profile
router.get('/me', verifyFirebaseToken, userController.getCurrentUser);

// Search users by name/email
router.get('/search', verifyFirebaseToken, userController.searchUsers);

// Get suggested users to add
router.get('/suggested', verifyFirebaseToken, userController.getSuggestedUsers);

// Register user if not exists (on login)
router.post('/register', verifyFirebaseToken, userController.registerUserIfNeeded);

module.exports = router;
