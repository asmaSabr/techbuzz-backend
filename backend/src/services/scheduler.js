const cron = require('node-cron');
const { fetchAllSubreddits } = require('../collectors/redditCollector');
const { extractKeywords, computeTrends } = require('./trendService');
const { publishTrends } = require('./redisService');
const Post = require('../models/Post');
const TrendSnapshot = require('../models/TrendSnapshot');

async function runCollection() {
  console.log('\n[Scheduler] Début de la collecte...');

  // 1. Fetch Reddit
  const posts = await fetchAllSubreddits();

  // 2. Extraire mots-clés et sauvegarder dans MongoDB
  for (const post of posts) {
    post.keywords = extractKeywords(post.title);
    await Post.findOneAndUpdate(
      { redditId: post.redditId },
      post,
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log(`[Scheduler] ${posts.length} posts sauvegardés`);

  // 3. Calculer les tendances
  const trends = await computeTrends();
  console.log(`[Scheduler] ${trends.length} tendances calculées`);

  // 4. Publier sur Redis
  await publishTrends(trends);

  // 5. Sauvegarder snapshots historiques ← ICI à l'intérieur
  for (const trend of trends) {
    await TrendSnapshot.create({
      keyword:      trend.keyword,
      count:        trend.count,
      totalScore:   trend.totalScore,
      avgScore:     trend.avgScore,
      momentum:     trend.momentum,
      avgSentiment: trend.avgSentiment,
      snapshotAt:   new Date(),
    });
  }
  console.log(`[Scheduler] ${trends.length} snapshots historiques sauvegardés`);
}

function startScheduler() {
  runCollection().catch(console.error);
  cron.schedule('*/10 * * * *', () => {
    runCollection().catch(console.error);
  });
  console.log('[Scheduler] Cron job démarré — collecte toutes les 10 min');
}

module.exports = { startScheduler };