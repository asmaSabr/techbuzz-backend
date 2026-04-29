const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const REDIS_HOST = 'localhost';
const REDIS_PORT = 6379;

// Deux clients séparés : un pour lpush, un pour blpop
// (blpop bloque la connexion, impossible de partager)
const redisPub = new Redis({ host: REDIS_HOST, port: REDIS_PORT,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

const redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redisPub.on('connect', () => logger.info('✅ Redis publisher connecté'));
redisPub.on('error', (err) => logger.error(`❌ Redis publisher erreur: ${err.message}`));
redisSub.on('connect', () => logger.info('✅ Redis subscriber connecté'));
redisSub.on('error', (err) => logger.error(`❌ Redis subscriber erreur: ${err.message}`));

const pendingJobs = new Map();

async function processWithPythonNLP(post) {
  const jobId = uuidv4();
  const timeout = 50000;

  return new Promise((resolve, reject) => {
    const message = {
      job_id: jobId,
      post_id: post._id?.toString() || post.redditId,
      title: post.title || '',
      content: post.content || '',
      source: 'reddit',
      language: 'en',
      timeout_ms: timeout
    };

    const timeoutId = setTimeout(() => {
      pendingJobs.delete(jobId);
      logger.warn(`⏰ Timeout NLP pour job ${jobId}`);
      reject(new Error('NLP processing timeout'));
    }, timeout);

    pendingJobs.set(jobId, { resolve, reject, timeoutId });

    // Vérifier que Redis est prêt avant d'envoyer
    if (redisPub.status !== 'ready') {
      pendingJobs.delete(jobId);
      clearTimeout(timeoutId);
      return reject(new Error('Redis non connecté'));
    }

    redisPub.lpush('nlp_queue', JSON.stringify(message))
      .then(() => logger.debug(`📤 Post envoyé au NLP worker: job_id=${jobId}`))
      .catch(err => {
        pendingJobs.delete(jobId);
        clearTimeout(timeoutId);
        logger.error(`❌ Erreur envoi NLP queue: ${err.message}`);
        reject(err);
      });
  });
}

function listenForNLPResults() {
  logger.info('👂 Écoute des réponses NLP sur "nlp_results_queue"...');

  async function waitForResults() {
    while (true) {
      try {
        // blpop lit à GAUCHE — cohérent avec lpush du worker Python
        const result = await redisSub.blpop('nlp_results_queue', 30);
        if (!result) continue;

        const [, rawResponse] = result;
        const response = JSON.parse(rawResponse);
        const jobId = response.job_id;

        const callback = pendingJobs.get(jobId);
        if (callback) {
          clearTimeout(callback.timeoutId);
          pendingJobs.delete(jobId);

          if (response.status === 'success') {
            logger.info(`✅ Réponse NLP reçue: job_id=${jobId}`);
            callback.resolve(response.result);
          } else {
            logger.warn(`⚠️ Erreur NLP pour job ${jobId}: ${response.error?.message}`);
            callback.reject(new Error(response.error?.message || 'NLP processing failed'));
          }
        } else {
          logger.debug(`ℹ️ Réponse NLP orpheline (job_id=${jobId})`);
        }
      } catch (err) {
        logger.error(`❌ Erreur écoute résultats NLP: ${err.message}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  waitForResults().catch(err => logger.error('🛑 Boucle écoute NLP arrêtée:', err));
}

module.exports = {
  processWithPythonNLP,
  listenForNLPResults,
  redis: redisPub
};