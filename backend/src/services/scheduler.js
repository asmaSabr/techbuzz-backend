const cron = require('node-cron');
const { fetchAllSubreddits } = require('../collectors/redditCollector');
const { addRawPosts } = require('../queues/postQueue');

async function runCollection() {
  console.log('\n[Scheduler] ━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[Scheduler] Début de la collecte...');
  const startTime = Date.now();

  try {
    // 1. Fetch Reddit — seule responsabilité du scheduler
    const posts = await fetchAllSubreddits();
    console.log(`[Scheduler] ${posts.length} posts récupérés depuis Reddit`);

    // 2. Envoie dans BullMQ — le pipeline prend le relais
    const count = await addRawPosts(posts);
    console.log(`[Scheduler] ${count} posts uniques envoyés dans le pipeline`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Scheduler] Collecte terminée en ${duration}s`);
    console.log('[Scheduler] ━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('[Scheduler] Erreur lors de la collecte:', err.message);
  }
}

function startScheduler() {
  // Lance immédiatement au démarrage
  runCollection();

  // Puis toutes les 10 minutes
  cron.schedule('*/10 * * * *', runCollection);

  console.log('[Scheduler] Cron job démarré — collecte toutes les 10 min');
}

module.exports = { startScheduler };