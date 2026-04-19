const cron = require('node-cron');
const { fetchAllSubreddits } = require('../collectors/redditCollector');
const { addRawPosts } = require('../queues/postQueue');
const logger = require('../utils/logger');
const { metrics } = require('../monitoring/metrics');

async function runCollection() {
  logger.info('[Scheduler] Début de la collecte...');
  const startTime = Date.now();

  try {
    // 1. Fetch Reddit — seule responsabilité du scheduler
    const posts = await fetchAllSubreddits();
    metrics.postsCollected.inc(posts.length);
    logger.info(`[Scheduler] ${posts.length} posts récupérés depuis Reddit`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`[Scheduler] Collecte terminée en ${duration}s`);

  } catch (err) {
    logger.error('[Scheduler] Erreur lors de la collecte:', err.message);
  }
}

function startScheduler() {
  // Lance immédiatement au démarrage
  runCollection();

  // Puis toutes les 10 minutes
  cron.schedule('*/10 * * * *', runCollection);

  logger.info('[Scheduler] Cron job démarré — collecte toutes les 10 min');
}

module.exports = { startScheduler };