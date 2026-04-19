const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const RawPost = require('../src/models/RawPost');

(async () => {
  await connectDB();
  
  // Insertion 
  const post = new RawPost({
    redditId: 'abc123',
    title: 'Test Post',
    content: 'Ceci est un post brut pour test',
    author: 'asma_dev',
    subreddit: 'programming',
    scoreRaw: 42,
    upvoteRatio: 0.95,
    numComments: 10,
    url: 'https://reddit.com/r/programming/test',
    flair: 'Discussion',
    createdAt: new Date(),
  });

  await post.save();
  console.log('[Test] Document inséré dans posts_raw:', post);

  // Lecture
  const posts = await RawPost.find({});
  console.log('[Test] Documents trouvés dans posts_raw:', posts);

  mongoose.connection.close();
})();
