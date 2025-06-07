const { Server } = require('socket.io');

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    socket.on('joinRoom', (roomId, callback) => {
      if (!roomId) return;
      socket.join(roomId);
      console.log(`📥 ${socket.id} joined room: ${roomId}`);
      if (callback) callback({ success: true });
    });

    socket.on('updateScore', ({ roomId, user }) => {
      if (!roomId || !user) return;
      io.to(roomId).emit('scoreUpdate', user);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocket };
