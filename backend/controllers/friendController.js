const Friend = require('../models/Friend');

// Send a friend request
exports.sendFriendRequest = async (req, res) => {
  const { recipient } = req.body;
  const requester = req.user.uid;

  console.log('📨 Sending friend request from:', requester, 'to:', recipient);

  try {
    if (!recipient) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }

    if (requester === recipient) {
      return res.status(400).json({ message: "You can't friend yourself" });
    }

    const existing = await Friend.findOne({
      $or: [
        { requester, recipient },
        { requester: recipient, recipient: requester },
      ],
    });

    if (existing) {
      return res.status(400).json({ message: 'Friend request or friendship already exists' });
    }

    const friendRequest = new Friend({ requester, recipient }); // status defaults to 'pending'
    await friendRequest.save();

    console.log('✅ Friend request saved');
    return res.status(201).json({ message: 'Friend request sent' });
  } catch (error) {
    console.error('❌ Error sending friend request:', error.message, error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Respond to friend request: accept or decline
exports.respondToRequest = async (req, res) => {
  const { requestId } = req.params;
  const { action } = req.body;
  const user = req.user.uid;

  console.log(`📬 Responding to friend request ${requestId} with action: ${action}`);

  try {
    const friendRequest = await Friend.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.recipient !== user) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }

    if (action === 'accept') {
      friendRequest.status = 'accepted';
      await friendRequest.save();
      console.log('✅ Friend request accepted');
      return res.json({ message: 'Friend request accepted' });
    } else if (action === 'decline') {
      friendRequest.status = 'declined';
      await friendRequest.save();
      console.log('🚫 Friend request declined');
      return res.json({ message: 'Friend request declined' });
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "accept" or "decline".' });
    }
  } catch (error) {
    console.error('❌ Error responding to friend request:', error.message, error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get list of friends (only accepted)
exports.getFriends = async (req, res) => {
  const user = req.user.uid;

  try {
    const friends1 = await Friend.find({ requester: user, status: 'accepted' }).select('recipient');
    const friends2 = await Friend.find({ recipient: user, status: 'accepted' }).select('requester');

    const friends = [
      ...friends1.map(f => f.recipient),
      ...friends2.map(f => f.requester),
    ];

    console.log('👥 Friends retrieved:', friends.length);
    return res.json({ friends });
  } catch (error) {
    console.error('❌ Error fetching friends:', error.message, error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get pending friend requests for the current user
exports.getPendingRequests = async (req, res) => {
  const user = req.user.uid;

  try {
    const pendingRequests = await Friend.find({ recipient: user, status: 'pending' });

    console.log('⏳ Pending requests found:', pendingRequests.length);
    return res.json({ pendingRequests });
  } catch (error) {
    console.error('❌ Error fetching pending requests:', error.message, error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
