const mongoose = require('mongoose');
const MatchRoom = require('../models/matchRoom_model');
const User = require('../models/User');

// Utility to check if ID is a valid Mongo ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create a new match room
exports.createMatchRoom = async (req, res) => {
  try {
    const { category, difficulty, amount, questions, customRoomId } = req.body;
    const uid = req.user.uid;
    const username = req.user.name;
    const photoUrl = req.user.picture;

    const newRoom = await MatchRoom.create({
      category,
      difficulty,
      amount,
      questions,
      customRoomId: customRoomId || null, // Optional
      players: [{ uid, username, photoUrl, score: 0, answers: [] }],
    });

    res.status(201).json({ roomId: customRoomId || newRoom._id });
  } catch (error) {
    console.error('❌ Error creating match room:', error);
    res.status(500).json({ message: 'Server error creating match room' });
  }
};

// Join an existing match room
exports.joinMatchRoom = async (req, res) => {
  try {
    const { roomId } = req.body;
    const uid = req.user.uid;
    const username = req.user.name;
    const photoUrl = req.user.picture;

    let room;
    if (isValidObjectId(roomId)) {
      room = await MatchRoom.findById(roomId);
    } else {
      room = await MatchRoom.findOne({ customRoomId: roomId });
    }

    if (!room) return res.status(404).json({ message: 'Room not found' });

    const alreadyJoined = room.players.some((player) => player.uid === uid);
    if (alreadyJoined) return res.status(400).json({ message: 'Already joined' });

    room.players.push({ uid, username, photoUrl, score: 0, answers: [] });
    await room.save();

    res.status(200).json({ message: 'Joined match room successfully' });
  } catch (error) {
    console.error('❌ Error joining match room:', error);
    res.status(500).json({ message: 'Server error joining match room' });
  }
};

// Submit an answer and update score
exports.submitAnswer = async (req, res) => {
  try {
    const { roomId, questionIndex, isCorrect, answer } = req.body;
    const uid = req.user.uid;

    let room;
    if (isValidObjectId(roomId)) {
      room = await MatchRoom.findById(roomId);
    } else {
      room = await MatchRoom.findOne({ customRoomId: roomId });
    }

    if (!room) return res.status(404).json({ message: 'Room not found' });

    const player = room.players.find((p) => p.uid === uid);
    if (!player) return res.status(404).json({ message: 'Player not found in room' });

    if (player.answers.length > questionIndex) {
      return res.status(400).json({ message: 'Answer already submitted for this question' });
    }

    player.answers[questionIndex] = answer;
    if (isCorrect) {
      player.score += 10; // Adjust score logic as needed
    }

    await room.save();

    res.status(200).json({ message: 'Answer submitted', score: player.score });
  } catch (error) {
    console.error('❌ Error submitting answer:', error);
    res.status(500).json({ message: 'Server error submitting answer' });
  }
};

// Get leaderboard for a match room
exports.getLeaderboard = async (req, res) => {
  try {
    const { roomId } = req.params;

    let room;
    if (isValidObjectId(roomId)) {
      room = await MatchRoom.findById(roomId);
    } else {
      room = await MatchRoom.findOne({ customRoomId: roomId });
    }

    if (!room) return res.status(404).json({ message: 'Room not found' });

    const leaderboard = room.players
      .map((player) => ({
        uid: player.uid,
        username: player.username,
        photoUrl: player.photoUrl,
        score: player.score,
      }))
      .sort((a, b) => b.score - a.score);

    res.status(200).json({ leaderboard });
  } catch (error) {
    console.error('❌ Error getting leaderboard:', error);
    res.status(500).json({ message: 'Server error getting leaderboard' });
  }
};
