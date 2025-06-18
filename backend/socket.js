const { Server } = require('socket.io');

let io; // shared across modules

function setupSocket(server) {
  io = new Server(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // ✅ joinRoom with callback and debug
    socket.on('joinRoom', (data, callback) => {
      const roomId = typeof data === 'string' ? data : data?.roomId;
      if (!roomId) {
        console.warn(`⚠️ joinRoom called with invalid data:`, data);
        if (callback) callback({ success: false, message: 'Invalid roomId' });
        return;
      }

      socket.join(roomId);
      console.log(`📥 ${socket.id} joined room: ${roomId}`);

      if (callback) callback({ success: true, roomId });
    });

    // ✅ Update score event
    socket.on('updateScore', ({ roomId, user }) => {
      if (!roomId || !user) return;
      console.log(`📊 Score update in ${roomId} for ${user.username}`);
      io.to(roomId).emit('scoreUpdate', user);
    });

    // ✅ Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// ✅ Access io instance from other files
function getIO() {
  if (!io) throw new Error("❌ Socket.io not initialized. Call setupSocket() first.");
  return io;
}

module.exports = { setupSocket, getIO };
