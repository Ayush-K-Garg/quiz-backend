const MatchRoom = require('../models/matchRoom_model');
const User = require('../models/User');

// ✅ Leaderboard Route
exports.getLeaderboard = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log('📊 [Leaderboard] Requested for Room ID:', roomId);

    const room = await MatchRoom.findById(roomId);
    if (!room) {
      console.warn('❌ [Leaderboard] Room not found');
      return res.status(404).json({ message: 'Match room not found' });
    }

    console.log(`👥 [Leaderboard] Total Players in Room: ${room.players.length}`);

    const leaderboard = await Promise.all(
      room.players.map(async (entry, index) => {
        console.log(`🔍 [Leaderboard] Processing player ${index + 1} UID: ${entry.user}`);
        try {
          const user = await User.findOne({ uid: entry.user });
          if (!user) {
            console.warn(`⚠️ [Leaderboard] No user found with UID: ${entry.user}`);
          }
          return {
            uid: entry.user,
            name: user?.name || 'Unknown',
            picture: user?.picture || '',
            score: entry.score ?? null,
          };
        } catch (err) {
          console.error(`❌ [Leaderboard] Error fetching user ${entry.user}:`, err);
          return {
            uid: entry.user,
            name: 'Error',
            picture: '',
            score: entry.score ?? null,
          };
        }
      })
    );

    leaderboard.sort((a, b) => {
      if (a.score == null) return 1;
      if (b.score == null) return -1;
      return b.score - a.score;
    });

    console.log('✅ [Leaderboard] Final Sorted Leaderboard:', leaderboard);

    res.status(200).json({ leaderboard });
  } catch (error) {
    console.error('❌ [Leaderboard] Server error:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
};

// ✅ Submit Score Route
exports.submitScore = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { score } = req.body;
    const uid = req.user.uid;

    console.log('📤 [SubmitScore] Submitting score');
    console.log('➡️ Room ID:', roomId);
    console.log('🧑 UID:', uid);
    console.log('🏆 Score:', score);

    const room = await MatchRoom.findById(roomId);
    if (!room) {
      console.warn('❌ [SubmitScore] Match room not found');
      return res.status(404).json({ message: 'Match room not found' });
    }

    const player = room.players.find(p => p.user === uid);
    if (!player) {
      console.warn(`❌ [SubmitScore] Player UID ${uid} not found in room`);
      return res.status(404).json({ message: 'User not in this match room' });
    }

    console.log(`✅ [SubmitScore] Player found. Previous score: ${player.score}`);
    player.score = score;
    await room.save();

    console.log('✅ [SubmitScore] Score updated and saved successfully');

    res.status(200).json({ message: 'Score submitted successfully' });
  } catch (error) {
    console.error('❌ [SubmitScore] Server error:', error);
    res.status(500).json({ message: 'Server error submitting score' });
  }
};
