const mongoose = require('mongoose');

const matchRoomSchema = new mongoose.Schema({
  // For custom room identification
  customRoomId: { type: String, unique: true, sparse: true },

  // Game configuration
  category: String,
  difficulty: String,
  amount: Number,
  status: { type: String, default: 'waiting' }, // waiting | started | finished

  // Capacity of the room (used in custom room mode)
  capacity: { type: Number, default: 2 }, // Host + others

  // Store host's UID to control starting logic
  hostUid: { type: String },

  // Player data
  players: [
    {
      uid: String,
      username: String,
      photoUrl: String,
      score: { type: Number, default: 0 },
      answers: [String],
    },
  ],

  // Pre-fetched questions for the room
  questions: Array,

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MatchRoom', matchRoomSchema);
