const mongoose = require('mongoose');
const http = require('http');
const app = require('./app');
const { setupSocket } = require('./socket');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quiz_app';

mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');

  const server = http.createServer(app);
  setupSocket(server); // 🔌 Enable Socket.IO

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
