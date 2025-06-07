const MatchRoom = require('../models/matchRoom_model');
const User = require('../models/User');

exports.getLeaderboard = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await MatchRoom.findById(roomId).populate('players.user', 'name picture');
    if (!room) return res.status(404).json({ message: 'Match room not found' });

    const leaderboard = room.players.map((entry) => ({
      uid: entry.user.uid,
      name: entry.user.name,
      picture: entry.user.picture,
      score: entry.score || 0,
    })).sort((a, b) => b.score - a.score);

    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
};

exports.submitScore = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { score } = req.body;
    const uid = req.user.uid;

    const room = await MatchRoom.findById(roomId);
    if (!room) return res.status(404).json({ message: 'Match room not found' });

    const player = room.players.find(p => p.user.toString() === req.user._id.toString());
    if (!player) return res.status(404).json({ message: 'User not in this match room' });

    player.score = score;
    await room.save();

    res.status(200).json({ message: 'Score submitted successfully' });
  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({ message: 'Server error submitting score' });
  }
};