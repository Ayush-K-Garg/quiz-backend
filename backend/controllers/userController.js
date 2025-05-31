const User = require('../models/User');

exports.searchUsers = async (req, res) => {
  const { query } = req.query;
  const currentUid = req.user.uid;

  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const users = await User.find({
      uid: { $ne: currentUid },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    }).select('uid name email picture');

    res.json(users);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ message: 'Server error during user search' });
  }
};

exports.getSuggestedUsers = async (req, res) => {
  const currentUid = req.user.uid;

  try {
    const users = await User.aggregate([
      { $match: { uid: { $ne: currentUid } } },
      { $sample: { size: 5 } },
      { $project: { uid: 1, name: 1, email: 1, picture: 1 } },
    ]);

    res.json(users);
  } catch (error) {
    console.error('Suggested users error:', error);
    res.status(500).json({ message: 'Server error fetching suggested users' });
  }
};
