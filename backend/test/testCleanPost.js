const connectDB = require('../src/config/db');
const CleanPost = require('../src/models/CleanPost');

(async () => {
  await connectDB();

  const post = new CleanPost({
    redditId: 'abc123',
    title: 'Test Clean Post',
    content: 'Ceci est un post nettoyé',
    author: 'asma_dev',
    subreddit: 'programming',
    scoreNorm: 42,
    upvoteRatio: 0.95,
    numComments: 10,
    url: 'https://reddit.com/r/programming/test',
    flair: 'Discussion',
    createdAt: new Date(),
  });

  await post.save();
  console.log('[Test] Document inséré dans posts_clean:', post);

  const posts = await CleanPost.find({});
  console.log('[Test] Documents trouvés dans posts_clean:', posts);

  process.exit(0);
})();
