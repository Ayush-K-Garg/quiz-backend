const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  requester: { type: String, required: true }, // Firebase UID
  recipient: { type: String, required: true }, // Firebase UID
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Friend', friendSchema);
