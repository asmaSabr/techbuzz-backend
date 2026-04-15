const { fetchSubredditPosts } = require('../src/collectors/redditCollector');

describe('Reddit Collector', () => {
  test('fetchSubredditPosts retourne les champs attendus', async () => {
    const posts = await fetchSubredditPosts('programming', 5);
    expect(posts.length).toBeGreaterThan(0);

    const post = posts[0];

    expect(post).toHaveProperty('redditId');
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('content');
    expect(post).toHaveProperty('author');
    expect(post).toHaveProperty('subreddit');
    expect(post).toHaveProperty('scoreRaw');
    expect(post).toHaveProperty('scoreNorm');
    expect(post).toHaveProperty('upvoteRatio');
    expect(post).toHaveProperty('numComments');
    expect(post).toHaveProperty('url');
    expect(post).toHaveProperty('flair');
    expect(post).toHaveProperty('createdAt');
    expect(post).toHaveProperty('collectedAt');
    expect(post).toHaveProperty('category');
  });
});
