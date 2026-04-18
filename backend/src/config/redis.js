const { createClient } = require('redis');

const publisher  = createClient({ url: process.env.REDIS_URL });
const subscriber = createClient({ url: process.env.REDIS_URL });
const logger = require('../utils/logger');

async function connectRedis() {
  try {
    await publisher.connect();
    await subscriber.connect();
    logger.info('[Redis] Connecté');
  } catch (err) {
    logger.error('[Redis] Erreur de connexion', err);
  }
}

module.exports = { connectRedis, publisher, subscriber };

