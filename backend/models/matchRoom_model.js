// models/matchRoom_model.js

const mongoose = require('mongoose');

const matchRoomSchema = new mongoose.Schema({
  customRoomId: { type: String, unique: true, sparse: true }, // 🔹 Add this line

  category: String,
  difficulty: String,
  amount: Number,
  status: { type: String, default: 'waiting' },
  players: [{
    uid: String,
    username: String,
    photoUrl: String,
    score: { type: Number, default: 0 },
    answers: [String],
  }],
  questions: Array,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MatchRoom', matchRoomSchema);
