const { redisClient } = require('../config/redis');

// Move recentTokens to Redis for scalability (list of JSON strings)
const getRecentTokens = async (sessionId) => {
  try {
    const tokensJson = await redisClient.lRange(`recent_tokens:${sessionId}`, 0, -1);
    return tokensJson.map(JSON.parse);
  } catch (err) {
    console.error('Redis get recent tokens error:', err.message);
    return []; // Fallback to empty
  }
};

const addRecentToken = async (sessionId, qrToken) => {
  try {
    const tokenObj = JSON.stringify({ qrToken, timestamp: Date.now() });
    await redisClient.rPush(`recent_tokens:${sessionId}`, tokenObj);
    await redisClient.lTrim(`recent_tokens:${sessionId}`, -5, -1); // Keep last 5
  } catch (err) {
    console.error('Redis add recent token error:', err.message);
  }
};

const deleteRecentTokens = async (sessionId) => {
  try {
    await redisClient.del(`recent_tokens:${sessionId}`);
  } catch (err) {
    console.error('Redis delete recent tokens error:', err.message);
  }
};

module.exports = { getRecentTokens, addRecentToken, deleteRecentTokens };
