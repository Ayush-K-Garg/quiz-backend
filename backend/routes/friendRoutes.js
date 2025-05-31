const express = require('express');
const router = express.Router();

const friendController = require('../controllers/friendController');
const authenticateFirebaseUser = require('../middleware/authMiddleware'); // ✅ import the function


router.use(authenticateFirebaseUser); // ✅ pass the actual function

// Routes
router.post('/request', friendController.sendFriendRequest);
router.put('/request/:requestId', friendController.respondToRequest);
router.get('/list', friendController.getFriends);
router.get('/pending', friendController.getPendingRequests);

module.exports = router;
