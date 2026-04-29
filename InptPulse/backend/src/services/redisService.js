const { publisher, subscriber } = require('../config/redis');
const logger = require('../utils/logger');
const { metrics } = require('../monitoring/metrics');


async function publishTrends(trends) {
  await publisher.publish('trends:update', JSON.stringify(trends));
  await publisher.setEx('trends:latest', 300, JSON.stringify(trends));
  metrics.redisConnected.set(1);
  logger.info('[Redis] Tendances publiées');
}

async function getLatestTrends() {
  const cached = await publisher.get('trends:latest'); // subscriber → publisher
  metrics.redisConnected.set(1);
  return cached ? JSON.parse(cached) : null;
}

module.exports = { publishTrends, getLatestTrends, subscriber };