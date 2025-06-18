const mongoose = require('mongoose');
const MatchRoom = require('../models/matchRoom_model');
const axios = require('axios');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Generate unique 6-char alphanumeric room code
const generateRoomCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Ensure customRoomId is unique
const generateUniqueCustomRoomId = async () => {
  let customRoomId, exists = true;
  while (exists) {
    customRoomId = generateRoomCode();
    exists = !!(await MatchRoom.findOne({ customRoomId }));
  }
  return customRoomId;
};

exports.createMatchRoom = async (req, res) => {
  try {
    const { category, difficulty, amount, questions, customRoomId, capacity } = req.body;
    const uid = req.user.uid, username = req.user.name, photoUrl = req.user.picture;
    console.log('🟢 Creating room...', { customRoomId, capacity });

    let finalCustomId = customRoomId;
    if (!customRoomId && capacity && capacity > 2) {
      finalCustomId = await generateUniqueCustomRoomId();
    } else if (customRoomId) {
      if (await MatchRoom.findOne({ customRoomId })) {
        return res.status(400).json({ message: 'customRoomId taken' });
      }
    }

    const roomData = {
      category, difficulty, amount,
      questions: [], capacity: capacity || 2,
      hostUid: uid,
      players: [{ uid, username, photoUrl, score: 0, answers: [] }],
      status: 'waiting',
      ...(finalCustomId && { customRoomId: finalCustomId })
    };

    const newRoom = await MatchRoom.create(roomData);
    console.log('✅ Room created:', newRoom._id, 'customCode:', newRoom.customRoomId);
    res.status(201).json({ roomId: newRoom.customRoomId || newRoom._id });
  } catch (err) {
    console.error('❌ createMatchRoom error:', err);
    res.status(500).json({ message: 'Server error creating room' });
  }
};

exports.joinMatchRoom = async (req, res) => {
  try {
    const { roomId } = req.body;
    const uid = req.user.uid, username = req.user.name, photoUrl = req.user.picture;
    console.log('🔎 Attempt join:', roomId);
    const room = isValidObjectId(roomId) ? await MatchRoom.findById(roomId) : await MatchRoom.findOne({ customRoomId: roomId });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.players.some(p => p.uid === uid)) return res.status(400).json({ message: 'Already joined' });
    if (room.players.length >= room.capacity) return res.status(403).json({ message: 'Room full' });

    room.players.push({ uid, username, photoUrl, score: 0, answers: [] });
    await room.save();
    console.log('✅ Joined:', roomId, 'players:', room.players.length);
    res.status(200).json({ message: 'Joined successfully' });
  } catch (err) {
    console.error('❌ joinMatchRoom error:', err);
    res.status(500).json({ message: 'Server error joining room' });
  }
};

exports.findOrCreateRandomMatch = async (req, res) => {
  try {
    const { category, difficulty, amount } = req.body;
    const uid = req.user.uid, username = req.user.name, photoUrl = req.user.picture;
    console.log('🔄 Random match request:', { category, difficulty, amount });

    let room = await MatchRoom.findOne({
      status: 'waiting', category, difficulty, amount, capacity: 2
    });

    if (room && !room.players.some(p => p.uid === uid)) {
      room.players.push({ uid, username, photoUrl, score: 0, answers: [] });
      if (room.players.length === 2) room.status = 'started';
      await room.save();
      console.log('✅ Joined existing:', room._id);
      return res.status(200).json({ roomId: room._id });
    }

    const newRoom = await MatchRoom.create({
      category, difficulty, amount, questions: [],
      capacity: 2, hostUid: uid,
      players: [{ uid, username, photoUrl, score: 0, answers: [] }],
      status: 'waiting'
    });
    console.log('🆕 Created new random:', newRoom._id);
    res.status(201).json({ roomId: newRoom._id });
  } catch (err) {
    console.error('❌ random error:', err);
    res.status(500).json({ message: 'Server error in random match' });
  }
};

exports.getMatchStatus = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = isValidObjectId(roomId)
      ? await MatchRoom.findById(roomId)
      : await MatchRoom.findOne({ customRoomId: roomId });

    if (!room) return res.status(404).json({ message: 'Room not found' });

    res.status(200).json({
      status: room.status,
      matchRoom: room,
    });
  } catch (err) {
    console.error('❌ getMatchStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.startCustomMatch = async (req, res) => {
  try {
    const { roomId, category, difficulty, questionCount } = req.body;
    const uid = req.user.uid;
    console.log('🎬 Start match:', roomId);

    const room = isValidObjectId(roomId)
      ? await MatchRoom.findById(roomId)
      : await MatchRoom.findOne({ customRoomId: roomId });

    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.hostUid !== uid) return res.status(403).json({ message: 'Only host can start the match' });
    if (room.players.length < 2) return res.status(400).json({ message: 'At least 2 players required' });

    console.log('🧠 Fetching questions for:', { category, difficulty, questionCount });

    const apiRes = await axios.get('http://localhost:3000/api/quiz/questions', {
      params: {
        category: category || room.category,
        difficulty: difficulty || room.difficulty,
        amount: questionCount || room.amount,
      },
    });

    const questions = apiRes.data;
    if (!Array.isArray(questions) || questions.length === 0) {
      console.error('❌ No questions retrieved');
      return res.status(400).json({ message: 'Failed to fetch questions' });
    }

    room.questions = questions;
    room.status = 'started';
    await room.save();

    console.log(`🚀 Game started: ${roomId}, ${questions.length} questions`);

    const io = req.app.get('io');
    const roomChannel = room.customRoomId || room._id.toString();
    console.log(`📢 Emitting 'matchStarted' to socket room: ${roomChannel}`);

    io.to(roomChannel).emit('matchStarted', {
      questions,
      matchRoom: room,
    });

    res.status(200).json({
      message: 'Match started',
      questions,
      matchRoom: room,
    });
  } catch (err) {
    console.error('❌ startCustomMatch error:', err);
    res.status(500).json({ message: 'Server error starting match' });
  }
};

exports.submitAnswer = async (req, res) => {
  try {
    const { roomId, questionIndex, isCorrect, answer } = req.body;
    const uid = req.user.uid;

    let room = isValidObjectId(roomId)
      ? await MatchRoom.findById(roomId)
      : await MatchRoom.findOne({ customRoomId: roomId });

    if (!room) return res.status(404).json({ message: 'Room not found' });

    const player = room.players.find((p) => p.uid === uid);
    if (!player) return res.status(404).json({ message: 'Player not found in room' });

    if (player.answers.length > questionIndex) {
      return res.status(400).json({ message: 'Answer already submitted for this question' });
    }

    player.answers[questionIndex] = answer;
    if (isCorrect) {
      player.score += 10;
    }

    await room.save();

    console.log(`✅ Answer saved: Q${questionIndex} by ${uid}, Correct: ${isCorrect}`);

    res.status(200).json({ message: 'Answer submitted', score: player.score });
  } catch (error) {
    console.error('❌ Error submitting answer:', error);
    res.status(500).json({ message: 'Server error submitting answer' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { roomId } = req.params;

    let room = isValidObjectId(roomId)
      ? await MatchRoom.findById(roomId)
      : await MatchRoom.findOne({ customRoomId: roomId });

    if (!room) return res.status(404).json({ message: 'Room not found' });

    const leaderboard = room.players
      .map((player) => ({
        uid: player.uid,
        username: player.username,
        photoUrl: player.photoUrl,
        score: player.score,
      }))
      .sort((a, b) => b.score - a.score);

    console.log('📊 Leaderboard:', leaderboard);

    res.status(200).json({ leaderboard });
  } catch (error) {
    console.error('❌ Error getting leaderboard:', error);
    res.status(500).json({ message: 'Server error getting leaderboard' });
  }
};

// 🔹 Get match questions
exports.getMatchQuestions = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = isValidObjectId(roomId)
      ? await MatchRoom.findById(roomId)
      : await MatchRoom.findOne({ customRoomId: roomId });

    if (!room) {
      console.error('❌ Room not found:', roomId);
      return res.status(404).json({ message: 'Room not found' });
    }

    console.log(`📥 Returning questions for room: ${roomId} (${room.questions.length} questions)`);

    res.status(200).json({ questions: room.questions });
  } catch (err) {
    console.error('❌ Error fetching match questions:', err);
    res.status(500).json({ message: 'Server error fetching questions' });
  }
};
