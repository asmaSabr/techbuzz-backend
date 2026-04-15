const { createClient } = require('redis');

const publisher  = createClient({ url: process.env.REDIS_URL });
const subscriber = createClient({ url: process.env.REDIS_URL });

async function connectRedis() {
  try {
    await publisher.connect();
    await subscriber.connect();
    console.log('[Redis] Connecté');
  } catch (err) {
    console.error('[Redis] Erreur de connexion', err);
  }
}

module.exports = { connectRedis, publisher, subscriber };

