const connectDB = require('../src/config/db');
const cleanWorker = require('../src/workers/cleanWorker');
const CleanPost = require('../src/models/CleanPost');

(async () => {
  await connectDB();

  console.log('[Test] Lancement du CleanWorker...');
  
  // Attends quelques secondes pour laisser le worker consommer la Raw Queue
  await new Promise(r => setTimeout(r, 10000));

  const posts = await CleanPost.find({}).limit(5);
  console.log('[Test] Posts trouvés dans posts_clean:', posts);

  process.exit(0);
})();
