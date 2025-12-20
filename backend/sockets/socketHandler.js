const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const ScannedToken = require('../models/ScannedToken');
const { addRecentToken, deleteRecentTokens } = require('../utils/redisHelpers');
const { generateSessionId, generateQRToken } = require('../utils/helpers');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('Professor connected:', socket.id);

    socket.on('startSession', async ({ classId }) => {
      try {
        const sessionId = generateSessionId();
        const qrToken = generateQRToken();
        const session = new Session({
          sessionId,
          classId,
          qrToken,
          lastRefresh: Date.now(),
          usedDevices: []
        });
        await session.save();
        socket.join(sessionId);
        socket.emit('sessionStarted', { sessionId, classId, qrToken });
        console.log(`Session started: ${sessionId} for class: ${classId}, token: ${qrToken}`);

        // Store initial token in Redis
        await addRecentToken(sessionId, qrToken);

        const qrInterval = setInterval(async () => {
          const session = await Session.findOne({ sessionId });
          if (session) {
            const newQrToken = generateQRToken();
            session.qrToken = newQrToken;
            session.lastRefresh = Date.now();
            await session.save();

            // Update in Redis
            await addRecentToken(sessionId, newQrToken);

            socket.emit('qrUpdate', { sessionId, qrToken: newQrToken });
            console.log(`QR token refreshed for session: ${sessionId}, token: ${newQrToken}`);
          } else {
            console.log(`Session ${sessionId} not found - stopping refresh`);
            clearInterval(qrInterval);
            await deleteRecentTokens(sessionId);
          }
        }, 1000); // 1-second refresh

        socket.on('endSession', async (sessionId) => {
          const session = await Session.findOne({ sessionId });
          if (session) {
            console.log(`Ending session: ${sessionId}, waiting for in-flight auth...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5s grace period
            await Attendance.deleteMany({ sessionId });
            await ScannedToken.deleteMany({ sessionId }); // Clean up scanned tokens
            await Session.deleteOne({ sessionId });
            io.emit('sessionEnded', { sessionId }); // Broadcast to all (including students)
            clearInterval(qrInterval);
            await deleteRecentTokens(sessionId);
            console.log(`Session fully ended: ${sessionId}`);
          }
        });

        socket.on('disconnect', () => {
          console.log('Professor disconnected:', socket.id);
        });
      } catch (err) {
        console.error('Start session error:', err.message);
        socket.emit('error', { message: 'Failed to start session' });
      }
    });
  });
};

module.exports = socketHandler;
