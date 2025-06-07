const User = require('../models/User');

exports.searchUsers = async (req, res) => {
  const { query } = req.query;
  const currentUid = req.user.uid;

  console.log('🔍 Search initiated by UID:', currentUid, 'with query:', query);

  if (!query) {
    console.warn('⚠️ No search query provided');
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

    console.log(`✅ Found ${users.length} users matching query "${query}"`);
    res.json(users);
  } catch (error) {
    console.error('❌ User search error:', error);
    res.status(500).json({ message: 'Server error during user search' });
  }
};

exports.getSuggestedUsers = async (req, res) => {
  const currentUid = req.user.uid;
  console.log('📦 Fetching suggested users for UID:', currentUid);

  try {
    const users = await User.aggregate([
      { $match: { uid: { $ne: currentUid } } },
      { $sample: { size: 5 } },
      { $project: { uid: 1, name: 1, email: 1, picture: 1 } },
    ]);

    console.log('✅ Suggested users fetched:', users.map(u => u.uid));
    res.json(users);
  } catch (error) {
    console.error('❌ Suggested users error:', error);
    res.status(500).json({ message: 'Server error fetching suggested users' });
  }
};

exports.getCurrentUser = async (req, res) => {
  console.log('🔍 Fetching current user for UID:', req.user.uid);
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) {
      console.warn('⚠️ Current user not found:', req.user.uid);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('✅ Current user found:', user.uid);
    res.json(user);
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
};

exports.registerUserIfNeeded = async (req, res) => {
  const { uid, email, name, picture } = req.user;

  console.log('👤 Attempting user registration or retrieval for UID:', uid);

  try {
    let user = await User.findOne({ uid });
    if (!user) {
      user = await User.create({ uid, email, name, picture });
      console.log('✅ New user registered:', uid);
    } else {
      console.log('ℹ️ User already exists:', uid);
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('❌ User registration error:', error);
    res.status(500).json({ message: 'Server error registering user' });
  }
};
