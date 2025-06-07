const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true }, // display name
  picture: { type: String },              // profile picture URL
  friends: [{ type: String }],            // array of UID strings
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
