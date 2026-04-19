const connectDB = require('../src/config/db');
const nlpWorker = require('../src/workers/nlpWorker');
const EnrichedPost = require('../src/models/EnrichedPost');

(async () => {
  await connectDB();

  console.log('[Test] Lancement du NLPWorker...');

  // Attends quelques secondes pour laisser le worker consommer la queue
  await new Promise(r => setTimeout(r, 10000));

  // Vérifie les posts enrichis
  const posts = await EnrichedPost.find({}).limit(5);
  console.log('[Test] Posts enrichis trouvés dans posts_enriched:', posts);

  process.exit(0);
})();
