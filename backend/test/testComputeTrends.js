const connectDB = require('../src/config/db');
const { computeTrends } = require('../src/services/trendService');
const EnrichedPost = require('../src/models/EnrichedPost');

(async () => {
  await connectDB();

  console.log('[Test] Lancement de computeTrends...');

  // Injecter quelques posts enrichis de test
  await EnrichedPost.insertMany([
    {
      redditId: 'test1',
      keywords: ['python', 'ai'],
      sentiment: 'positive',
      sentimentScore: 0.8,
      engagementScore: 50,
      category: 'langage',
      enrichedAt: new Date(),
    },
    {
      redditId: 'test2',
      keywords: ['python'],
      sentiment: 'negative',
      sentimentScore: -0.5,
      engagementScore: 30,
      category: 'langage',
      enrichedAt: new Date(),
    },
    {
      redditId: 'test3',
      keywords: ['ai'],
      sentiment: 'neutral',
      sentimentScore: 0,
      engagementScore: 70,
      category: 'ia',
      enrichedAt: new Date(),
    },
  ]);

  // Exécuter computeTrends
  const trends = await computeTrends(24);

  console.log('[Test] Résultats computeTrends:', trends);

  process.exit(0);
})();
