const { createWorker }   = require('../queues/index');
const { computeTrends }  = require('../services/trendService');
const { publishTrends }  = require('../services/redisService');
const TrendSnapshot      = require('../models/TrendSnapshot');
const logger = require('../utils/logger');
const { metrics } = require('../monitoring/metrics');



let trendCount   = 0;
let failedCount  = 0;

// Worker qui écoute la queue enriched_posts
const trendWorker = createWorker('enriched_posts', async (job) => {
    metrics.jobsProcessed.inc({ worker: 'trend', status: 'queued' });
    return { queued: true};
    },{
      concurrency: 1, 
    });
    setInterval(async () => {
    logger.info('[TrendWorker] Calcul périodique des tendances…');
    const end = metrics.jobDuration.startTimer({ worker: 'trend' }); 
    try {

      // 1. Calcule les tendances
      const trends = await computeTrends();
      metrics.trendsComputed.set(trends.length);

      if (trends.length > 0) {
      await TrendSnapshot.insertMany(
        trends.map(t => ({ ...t, snapshotAt: new Date() }))
      );

      trendCount += trends.length;
      metrics.jobsProcessed.inc({ worker: 'trend', status: 'success' });

      // 3. Publie sur Redis → WebSocket → Frontend
      await publishTrends(trends);

      logger.info(`[TrendWorker] ${trends.length} tendances insérées et publiées`);
    } else {
      logger.info('[TrendWorker] Aucune tendance calculée');
      }
    } catch (err) {
      failedCount++;
      metrics.jobsProcessed.inc({ worker: 'trend', status: 'error' });
      metrics.jobsFailed.inc({ worker: 'TrendWorker' });
      logger.error('[TrendWorker] Erreur calcul tendances:', err.message);
    } finally {
      end(); // ← toujours exécuté, succès ou erreur
    }

  }, 60000); // toutes les 60 secondesb

// Stats toutes les minutes
setInterval(() => {
  logger.info(`[TrendWorker] Stats — snapshots: ${trendCount} | erreurs: ${failedCount}`);
}, 60000);

module.exports = trendWorker;

