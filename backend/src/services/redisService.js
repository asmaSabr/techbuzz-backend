const { publisher, subscriber } = require('../config/redis');


async function publishTrends(trends) {
  await publisher.publish('trends:update', JSON.stringify(trends));
  await publisher.setEx('trends:latest', 300, JSON.stringify(trends));
  console.log('[Redis] Tendances publiées');
}

async function getLatestTrends() {
  const cached = await publisher.get('trends:latest'); // subscriber → publisher
  return cached ? JSON.parse(cached) : null;
}

module.exports = { publishTrends, getLatestTrends, subscriber };