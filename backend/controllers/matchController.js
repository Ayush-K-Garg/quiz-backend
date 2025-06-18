const mongoose = require('mongoose');
const MatchRoom = require('../models/matchRoom_model');
const axios = require('axios');
const User = require('../models/User');
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
    const uid = req.user?.uid?.trim();

    console.log('🔎 [Join Attempt] RoomID:', roomId, '| UID:', uid);

    if (!uid) {
      console.warn('⚠️ [Join Fail] Missing UID in request.user');
      return res.status(401).json({ message: 'Unauthorized: UID missing' });
    }

    // Step 1: Find room
    const room = isValidObjectId(roomId)
      ? await MatchRoom.findById(roomId)
      : await MatchRoom.findOne({ customRoomId: roomId });

    if (!room) {
      console.warn('❌ [Join Fail] Room not found for ID:', roomId);
      return res.status(404).json({ message: 'Room not found' });
    }

    console.log('📦 [Room Found] ID:', room._id, '| Current Players:', room.players.length);

    // Step 2: Check if already joined
    const alreadyInRoom = room.players.some(p => p.uid === uid);
    if (alreadyInRoom) {
      console.log('🟡 [Already in Room] UID:', uid);
      return res.status(200).json({ message: 'Already joined', room });
    }

    // Step 3: Check capacity
    if (room.players.length >= room.capacity) {
      console.warn('🚫 [Room Full] Max Capacity Reached | UID:', uid);
      return res.status(403).json({ message: 'Room is full' });
    }

    // Step 4: Get user info
    let user;
    try {
      user = await User.findOne({ uid });
      if (!user) {
        console.warn(`⚠️ [User Lookup] No DB user found for UID ${uid}`);
      }
    } catch (e) {
      console.error(`❌ [User Fetch Error] UID ${uid}:`, e);
    }

    const username = (user?.name || req.user?.name || 'Unknown').trim();
    const photoUrl = (user?.picture || req.user?.picture || '').trim();

    // Step 5: Add new player
    const newPlayer = {
      uid,
      username,
      photoUrl,
      score: 0,
      answers: [],
    };

    console.log('➕ [Adding Player]', newPlayer);

    room.players.push(newPlayer);

    await room.save();

    console.log('✅ [Join Success] UID:', uid, '| Total Players:', room.players.length);
    res.status(200).json({ message: 'Joined successfully', room });

  } catch (err) {
    console.error('❌ [joinMatchRoom Error]:', err);
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
    const trimmedRoomId = roomId?.trim();

    console.log('📊 [Leaderboard] Request received for Room ID:', trimmedRoomId);

    if (!trimmedRoomId) {
      console.warn('⚠️ [Leaderboard] No roomId provided in request');
      return res.status(400).json({ message: 'Missing roomId in request' });
    }

    // Step 1: Fetch MatchRoom
    let room = null;
    if (isValidObjectId(trimmedRoomId)) {
      room = await MatchRoom.findById(trimmedRoomId);
    } else {
      room = await MatchRoom.findOne({ customRoomId: trimmedRoomId });
    }

    if (!room) {
      console.warn('❌ [Leaderboard] Room not found for ID:', trimmedRoomId);
      return res.status(404).json({ message: 'Room not found' });
    }

    console.log(`👥 [Leaderboard] Room ID: ${room._id} | Total Players: ${room.players.length}`);

    // Step 2: Process each player and construct leaderboard
    const leaderboard = [];

    for (let i = 0; i < room.players.length; i++) {
      const player = room.players[i];
    
      if (!player || typeof player.uid !== 'string' || !player.uid.trim()) {
        console.warn(`⚠️ [Leaderboard] Skipping player #${i + 1} due to missing or invalid UID:`, player);
        continue;
      }
    
      const uid = player.uid.trim();
      console.log(`🔍 [Leaderboard] Processing player #${i + 1} | UID: ${uid}`);
    
      let user = null;
      try {
        user = await User.findOne({ uid });
        if (!user) {
          console.warn(`⚠️ [Leaderboard] No user found in DB for UID: ${uid}`);
        } else {
          console.log(`🧠 [Leaderboard] Found User: ${user.name}`);
        }
      } catch (dbErr) {
        console.error(`❌ [Leaderboard] DB Error while fetching user ${uid}:`, dbErr.message);
      }
    
      const name = user?.name || player.username || 'Unknown';
      const picture = user?.picture || player.photoUrl || '';
      const score = typeof player.score === 'number' ? player.score : 0;
    
      leaderboard.push({ uid, name, picture, score });
    
      console.log(`📌 [Player #${i + 1}] Name: ${name} | Score: ${score}`);
    }
    

    // Step 3: Sort the leaderboard
    leaderboard.sort((a, b) => b.score - a.score);

    console.log('✅ [Leaderboard] Final Leaderboard:', JSON.stringify(leaderboard, null, 2));

    return res.status(200).json({ leaderboard });

  } catch (error) {
    console.error('❌ [Leaderboard] Fatal server error:', error);
    return res.status(500).json({ message: 'Server error getting leaderboard' });
  }
};


// 🔹 Get match questions
exports.getMatchQuestions = async (req, res) => {
  try {
    const { roomId } = req.query; // ✅ FIXED: use query, not params
    console.log('📥 [GET QUESTIONS] roomId =', roomId);

    const room = isValidObjectId(roomId)
      ? await MatchRoom.findById(roomId)
      : await MatchRoom.findOne({ customRoomId: roomId });

    if (!room) {
      console.error('❌ [GET QUESTIONS] Room not found:', roomId);
      return res.status(404).json({ message: 'Room not found' });
    }

    console.log(`✅ [GET QUESTIONS] Returning ${room.questions.length} questions`);
    res.status(200).json(room.questions); // return array directly, not { questions: [...] }
  } catch (err) {
    console.error('❌ [GET QUESTIONS] Error:', err);
    res.status(500).json({ message: 'Server error fetching questions' });
  }
};
exports.getMatchRoomDebug = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = isValidObjectId(roomId)
      ? await MatchRoom.findById(roomId)
      : await MatchRoom.findOne({ customRoomId: roomId });

    if (!room) {
      console.error('❌ [Debug] Room not found:', roomId);
      return res.status(404).json({ message: 'Room not found' });
    }

    console.log(`🪛 [Debug] Returning full match room data: ${room._id}`);
    return res.status(200).json(room); // includes questions, players, etc.
  } catch (err) {
    console.error('❌ [Debug] Error fetching debug room:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


exports.submitAnswersBulk = async (req, res) => {
  try {
    const { roomId, answers, score } = req.body;
    const uid = req.user?.uid;

    console.log('🔹 [submitAnswersBulk] Incoming request');
    console.log('➡️ Room ID:', roomId);
    console.log('🆔 UID:', uid);
    console.log('🏆 Score:', score);
    console.log('📦 Answers:', answers);

    if (!uid || !roomId || !answers || score === undefined) {
      console.warn('⚠️ Missing data:', { uid, roomId, answers, score });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Step 1: Find the room
    const room = await MatchRoom.findById(roomId);
    if (!room) {
      console.warn('❌ [Room Not Found]', roomId);
      return res.status(404).json({ message: 'Room not found' });
    }

    // Step 2: Find the player in the room
    const playerIndex = room.players.findIndex(p => p.uid === uid);
    if (playerIndex === -1) {
      console.warn('❌ [Player Not Found] UID:', uid);
      return res.status(404).json({ message: 'Player not found in this room' });
    }

    // Step 3: Format answers into expected structure
    const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
      index: parseInt(index),
      answer: answer,
    }));
    console.log('🧾 Formatted Answers:', formattedAnswers);

    // Step 4: Fetch fallback user data
    let { username, photoUrl } = room.players[playerIndex] ?? {};
    if (!username || !photoUrl) {
      const user = await User.findOne({ uid });
      if (user) {
        username = user.name || username;
        photoUrl = user.picture || photoUrl;
        console.log('🔄 [User DB Fallback] Name:', username, '| Picture:', photoUrl);
      } else {
        console.warn('⚠️ [No DB User Found] Using default name/pic');
      }
    }

    // Step 5: Update player object directly and save safely
    const updatePlayerData = () => {
      room.players[playerIndex] = {
        ...room.players[playerIndex],
        uid,
        username: username || 'Unknown',
        photoUrl: photoUrl || '',
        score,
        answers: formattedAnswers,
      };
      room.markModified('players');
    };

    updatePlayerData();

    try {
      await room.save();
    } catch (err) {
      if (err.name === 'VersionError') {
        console.warn('⚠️ [VersionError] Retrying with fresh room...');
        const freshRoom = await MatchRoom.findById(roomId);
        const freshIndex = freshRoom.players.findIndex(p => p.uid === uid);
        if (freshIndex !== -1) {
          room.players = freshRoom.players;
          updatePlayerData();
          await room.save();
        } else {
          console.error('❌ [Retry Failed] Player not found after version error');
          return res.status(500).json({ message: 'Failed to retry update after version conflict' });
        }
      } else {
        throw err;
      }
    }

    // Step 6: Debug final saved player
    const updatedRoom = await MatchRoom.findById(roomId);
    const updatedPlayer = updatedRoom.players.find(p => p.uid === uid);
    console.log('🧠 [Debug] Updated Player:', updatedPlayer);

    console.log(`✅ [submitAnswersBulk] Saved ${formattedAnswers.length} answers for UID: ${uid}, Score: ${score}`);
    return res.status(200).json({ message: 'Answers submitted successfully', score });

  } catch (error) {
    console.error('❌ [submitAnswersBulk] Internal Error:', error);
    return res.status(500).json({ message: 'Internal server error while submitting answers' });
  }
};
