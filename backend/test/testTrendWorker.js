const connectDB = require('../src/config/db');
const trendWorker = require('../src/workers/trendWorker');
const TrendSnapshot = require('../src/models/TrendSnapshot');

(async () => {
  await connectDB();

  console.log('[Test] Lancement du TrendWorker...');

  // Attends un peu pour laisser le worker consommer et déclencher computeTrends
  await new Promise(r => setTimeout(r, 70000)); // 70s pour dépasser le délai de 60s

  // Vérifie les snapshots insérés
  const snapshots = await TrendSnapshot.find({}).limit(5);
  console.log('[Test] Snapshots de tendances trouvés dans trend_snapshots:', snapshots);

  process.exit(0);
})();
