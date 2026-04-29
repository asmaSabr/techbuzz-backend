const { createWorker } = require('../queues/index');
const { enrichedQueue } = require('../queues/postQueue');
// const { enrichPost } = require('../processors/nlpProcessor'); // ← On ne l'utilise plus (remplacé par Python)
const EnrichedPost = require('../models/EnrichedPost');
const logger = require('../utils/logger');
const { metrics } = require('../monitoring/metrics');
const { processWithPythonNLP } = require('../services/pythonBridgeService'); // ← Ton service existant

let enrichedCount = 0;
let failedCount = 0;

const nlpWorker = createWorker('processed_posts', async (job) => {
  const end = metrics.jobDuration.startTimer({ worker: 'nlp' });
  const post = job.data;

  try {
    // ─────────────────────────────────────────────
    // 1. APPEL AU WORKER PYTHON (NLP sémantique)
    // ─────────────────────────────────────────────
    logger.debug(`[NLPWorker] Envoi post ${post.redditId} au worker Python...`);
    
    const nlpResult = await processWithPythonNLP({
      _id: post._id,
      redditId: post.redditId,
      title: post.title,
      content: post.content || '',
      subreddit: post.subreddit
    });

    // ─────────────────────────────────────────────
    // 2. FUSION DES RÉSULTATS (Python + metadata locale)
    // ─────────────────────────────────────────────
    const enriched = {
      // Metadata conservées du post original
      redditId: post.redditId,
      title: post.title,
      content: post.content,
      author: post.author,
      subreddit: post.subreddit,
      scoreRaw: post.scoreRaw,
      upvoteRatio: post.upvoteRatio,
      numComments: post.numComments,
      url: post.url,
      flair: post.flair,
      createdAt: post.createdAt,
      collectedAt: post.collectedAt,
      category: post.category,

      // Résultats NLP sémantiques depuis Python
      keywords: nlpResult.keywords?.map(k => k.text) || [],
      entities: nlpResult.entities || [],
      sentiment: nlpResult.sentiment?.label || 'neutral',
      sentimentScore: nlpResult.sentiment?.score ?? 0,
      language: nlpResult.language || 'en',

      // Metadata de traitement
      nlpProcessedAt: new Date(),
      nlpModelVersion: nlpResult.model_version || 'python-v1.0',
      nlpProcessingTimeMs: nlpResult.processing_time_ms
    };

    // ─────────────────────────────────────────────
    // 3. SAUVEGARDE IDÉMPOTENTE DANS MONGODB ✅
    // ─────────────────────────────────────────────
    await EnrichedPost.findOneAndUpdate(
      { redditId: enriched.redditId }, // ← Clé d'unicité
      enriched,
      { upsert: true, returnDocument: 'after' } // ← Idempotence garantie
    );

    // ─────────────────────────────────────────────
    // 4. ENVOI VERS LE WORKER DE TRENDS (prochaine étape)
    // ─────────────────────────────────────────────
    await enrichedQueue.add('compute-trends', enriched, {
      removeOnComplete: 100, // Garde seulement les 100 derniers jobs réussis
      removeOnFail: 50       // Garde seulement les 50 derniers échecs
    });

    // ✅ Succès
    enrichedCount++;
    metrics.jobsProcessed.inc({ worker: 'nlp', status: 'success' });
    logger.info(`[NLPWorker] ✅ Post ${post.redditId} enrichi: ${enriched.keywords.length} keywords`);
    
    return { 
      success: true, 
      redditId: post.redditId,
      keywordsCount: enriched.keywords.length,
      processingTime: nlpResult.processing_time_ms
    };

  } catch (err) {
    // ❌ Gestion d'erreur robuste
    failedCount++;
    metrics.jobsProcessed.inc({ worker: 'nlp', status: 'error' });
    metrics.jobsFailed.inc({ worker: 'NLPWorker' });
    
    logger.error(`[NLPWorker] ❌ Échec enrichissement post ${post.redditId}:`, {
      error: err.message,
      stack: err.stack,
      pythonAvailable: err.code !== 'PYTHON_UNAVAILABLE'
    });

    // Option A: Retry automatique via BullMQ (si erreur transitoire)
    if (err.message.includes('timeout') || err.message.includes('Redis')) {
      throw err; // BullMQ va retry automatiquement selon ta config de queue
    }

    // Option B: Fallback vers NLP basique Node.js (si Python down)
    // const fallback = enrichPost(post); // ← Ta logique Node.js de secours
    // await EnrichedPost.findOneAndUpdate({ redditId: post.redditId }, fallback, { upsert: true });
    // logger.warn(`[NLPWorker] ⚠️ Fallback Node.js utilisé pour ${post.redditId}`);

    return { 
      failed: true, 
      redditId: post.redditId,
      error: err.message 
    };

  } finally {
    end(); // ← Toujours exécuté, succès ou erreur
  }
}, {
  concurrency: 5, // ← Garde ta config de concurrence
  limiter: {
    max: 10, // Max 10 jobs par...
    duration: 1000 // ...seconde (évite de surcharger le worker Python)
  }
});

// Stats toutes les minutes
setInterval(() => {
  if (enrichedCount > 0 || failedCount > 0) {
    logger.info(`[NLPWorker] 📊 Stats — enrichis: ${enrichedCount} | échoués: ${failedCount} | taux: ${Math.round(enrichedCount/(enrichedCount+failedCount)*100)}%`);
    // Reset pour la prochaine fenêtre (optionnel)
    // enrichedCount = 0;
    // failedCount = 0;
  }
}, 60000);

// Graceful shutdown (bonne pratique BullMQ)
process.on('SIGINT', async () => {
  logger.info('[NLPWorker] 🛑 Arrêt gracieux...');
  await nlpWorker.close();
  process.exit(0);
});

module.exports = nlpWorker;