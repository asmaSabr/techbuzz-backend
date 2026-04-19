const connectDB = require('../src/config/db');
const { fetchSubredditPosts } = require('../src/collectors/redditCollector');
const RawPost = require('../src/models/RawPost');

(async () => {
  await connectDB();

  console.log('[Test] Lancement du Collector sur r/programming...');
  const posts = await fetchSubredditPosts('programming', 5); // limiter à 5 posts pour test

  for (const p of posts) {
    try {
      const doc = new RawPost(p);
      await doc.save();
      console.log(`[Test] Post ${p.redditId} inséré dans posts_raw`);
    } catch (err) {
      if (err.code === 11000) {
        console.log(`[Test] Post ${p.redditId} déjà existant`);
      } else {
        console.error('[Test] Erreur insertion:', err.message);
      }
    }
  }

  const allPosts = await RawPost.find({ subreddit: 'programming' }).limit(5);
  console.log('[Test] Posts trouvés dans posts_raw:', allPosts);

  process.exit(0);
})();
