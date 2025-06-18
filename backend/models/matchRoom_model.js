const mongoose = require('mongoose');

const matchRoomSchema = new mongoose.Schema({
  customRoomId: { type: String, unique: true, sparse: true },

  category: { type: String, default: 'General Knowledge' },
  difficulty: { type: String, default: 'easy' },
  amount: { type: Number, default: 5 },
  status: { type: String, default: 'waiting' },

  capacity: { type: Number, default: 2 },

  hostUid: { type: String, default: '' },

  players: [
    {
      uid: { type: String, required: true },
      username: { type: String, default: 'Unknown' },
      photoUrl: { type: String, default: '' },
      score: { type: Number, default: 0 },
      answers: [
        {
          index: Number,
          answer: String,
        },
      ],
    },
  ],

  questions: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MatchRoom', matchRoomSchema);
