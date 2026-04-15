const { createWorker }  = require('../queues/index');
const { enrichedQueue } = require('../queues/postQueue');
const { enrichPost }    = require('../processors/nlpProcessor');
const Post              = require('../models/Post');

const nlpWorker = createWorker('processed_posts', async (job) => {
  const post = job.data;

  // 1. Enrichit avec NLP
  const enriched = enrichPost(post);

  // 2. Sauvegarde dans MongoDB
  await Post.findOneAndUpdate(
    { redditId: enriched.redditId },
    enriched,
    { upsert: true, returnDocument: 'after' }
  );

  // 3. Envoie vers le worker de tendances
  await enrichedQueue.add('compute-trends', enriched);

  return { success: true, keywords: enriched.keywords };
}, {
  concurrency: 5,
});

module.exports = nlpWorker;