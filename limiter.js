require('dotenv').config();
const redis = require('redis');
const RateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL });

const limiter = new RateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'anna:rl:',
  }),
  max: 200,
  delayMs: 0,
});

module.exports = limiter;