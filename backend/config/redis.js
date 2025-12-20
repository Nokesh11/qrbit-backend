const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URI
});

redisClient.on('error', err => console.error('Redis Client Error', err));
redisClient.on('ready', () => console.log('Redis connected'));

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Redis connection failed:', err.message);
  }
};

module.exports = { redisClient, connectRedis };
