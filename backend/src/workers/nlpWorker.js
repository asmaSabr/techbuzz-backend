const { createWorker }  = require('../queues/index');
const { enrichedQueue } = require('../queues/postQueue');
const { enrichPost }    = require('../processors/nlpProcessor');
const EnrichedPost      = require('../models/EnrichedPost');
const logger = require('../utils/logger');
const { metrics } = require('../monitoring/metrics');

let enrichedCount = 0;
let failedCount   = 0;

const nlpWorker = createWorker('processed_posts', async (job) => {
  const end = metrics.jobDuration.startTimer({ worker: 'nlp' });
  const post = job.data;

  try {
    // 1. Enrichit avec NLP
    const enriched = enrichPost(post);

    // 2. Sauvegarde dans MongoDB (posts_enriched)
    await EnrichedPost.findOneAndUpdate(
      { redditId: enriched.redditId },
      enriched,
      { upsert: true, returnDocument: 'after' }
    );

    // 3. Envoie vers le worker de tendances
    await enrichedQueue.add('compute-trends', enriched);

    enrichedCount++;
    metrics.jobsProcessed.inc({ worker: 'nlp', status: 'success' });
    return { success: true, keywords: enriched.keywords };
  } catch (err) {
    failedCount++;
    metrics.jobsProcessed.inc({ worker: 'nlp', status: 'error' });
    metrics.jobsFailed.inc({ worker: 'NLPWorker' });
    logger.error('[NLPWorker] Erreur enrichissement:', err.message);
    return { failed: true, redditId: post.redditId };
  }finally {
    end(); // ← toujours exécuté, succès ou erreur
  }
  }, {
  concurrency: 5,
  });

// Stats toutes les minutes
setInterval(() => {
  logger.info(`[NLPWorker] Stats — enrichis: ${enrichedCount} | échoués: ${failedCount}`);
}, 60000);

module.exports = nlpWorker;
