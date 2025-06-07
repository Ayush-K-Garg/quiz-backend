const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Route imports
const userRoutes = require('./routes/userRoutes');
const friendRoutes = require('./routes/friendRoutes');
const quizRoutes = require('./routes/quizRoutes');
const matchRoomRoutes = require('./routes/matchRoutes'); // New for multiplayer
const leaderboardRoutes = require('./routes/leaderboardRoutes'); // Optional

// Route usage
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/match', matchRoomRoutes);         // New route for multiplayer logic
app.use('/api/leaderboard', leaderboardRoutes); // Optional, for real-time or final result leaderboard

// Health check
app.get('/', (req, res) => {
  res.send('🧠 Quiz API is up and running!');
});

module.exports = app;
