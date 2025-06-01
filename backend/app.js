const express = require('express');
const app = express();

// other middleware and route imports
const friendRoutes = require('./routes/friendRoutes');
const userRoutes = require('./routes/userRoutes');
const quizRoutes = require('./routes/quizRoutes');
app.use('/api/quiz', quizRoutes);

app.use(express.json());

// Use friend routes under /api/friends
app.use('/api/friends', friendRoutes);

// Use user routes under /api/users
app.use('/api/users', userRoutes);

// export app to be used in server.js
module.exports = app;
