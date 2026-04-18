const { createWorker } = require('../queues/index');
const { processedQueue } = require('../queues/postQueue');
const { cleanPost } = require('../processors/cleanProcessor');
const CleanPost = require('../models/CleanPost');
const logger = require('../utils/logger');
const { metrics } = require('../monitoring/metrics');


let processedCount = 0;
let failedCount    = 0;

const cleanWorker = createWorker('raw_posts', async (job) => {
  const end = metrics.jobDuration.startTimer({ worker: 'clean' });
  const post = job.data;

  try {
    // 1. Nettoie et valide
    const cleaned = cleanPost(post);
    if (!cleaned) {
      failedCount++;
      return { skipped: true, reason: 'invalid post' };
    }
  // 2. Persiste dans posts_clean
  try {
    const doc = new CleanPost(cleaned);
    await doc.save();
    logger.info(`[CleanWorker] Post ${cleaned.redditId} inséré dans posts_clean`);
    metrics.jobsProcessed.inc({ worker: 'clean', status: 'success' });
  } catch (err) {
    if (err.code === 11000) {
      logger.info(`[CleanWorker] Post ${cleaned.redditId} déjà existant`);
      metrics.jobsProcessed.inc({ worker: 'clean', status: 'duplicate' });
    } else {
      metrics.jobsProcessed.inc({ worker: 'clean', status: 'error' });
      metrics.jobsFailed.inc({ worker: 'CleanWorker' });
      logger.error('[CleanWorker] Erreur insertion:', err.message);
    }
  }

  // 3. Envoie vers la queue suivante
  await processedQueue.add('enrich-post', cleaned, {
    priority: post.score > 100 ? 1 : 2,  // posts populaires prioritaires
  });

  processedCount++;
  return { success: true, redditId: post.redditId };
 } finally{end();} }
, {
  concurrency: 10,  // 10 posts nettoyés en parallèle
});

// Stats toutes les minutes
setInterval(() => {
  logger.info(`[CleanWorker] Stats — traités: ${processedCount} | invalides: ${failedCount}`);
}, 60000);

module.exports = cleanWorker;