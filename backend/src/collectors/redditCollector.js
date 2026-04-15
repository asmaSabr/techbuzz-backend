require('dotenv').config();
const axios = require('axios');
const { getCategory } = require('../services/categoryService');

const TECH_SUBREDDITS = [
  'programming',
  'webdev', 
  'MachineLearning',
  'javascript',
  'Python',
  'artificial',
  'devops',
  'opensource',
  'reactjs', 'node', 'typescript', 'rust', 'golang',
  'aws', 'docker', 'kubernetes', 'datascience', 'deeplearning',
  'github', 'linux', 'cybersecurity', 'cloudcomputing',
  'mongodb', 'postgresql', 'sql', 'database',
  'frontend', 'backend', 'fullstack', 'webassembly','claudeai', 
  'gemini', 'chatgpt', 'llm', 'Java', 'kotlin', 'swift', 'scala', 'cpp',
  'angular', 'nextjs', 'svelte', 'fastapi', 'django', 'flask', 'spring', 'laravel',
  'SpringBoot', 'web3', 'microservices', 'serverless',
];

const HEADERS = {
  'User-Agent': 'TechBuzzTracker/1.0 (educational project)',
  'Accept': 'application/json',
};

async function fetchSubredditPosts(subreddit, limit = 100) {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
  
  const res = await axios.get(url, { headers: HEADERS });
  const posts = res.data.data.children;

  return posts.map(({ data }) => {
     // On prend quelques mots-clés pour la classification
    const keywords = [
      data.subreddit.toLowerCase(),
      ...(data.title.toLowerCase().split(' ')) // découper le titre en mots
    ];
    const category = getCategory(keywords);

    return {
        redditId:    data.id,
        title:       data.title,
        content:     data.selftext || null,
        author: data.author,
        subreddit:   data.subreddit,
        scoreRaw:    data.score,                  // score original
        scoreNorm:   Math.max(0, data.score),     // score borné
        upvoteRatio: data.upvote_ratio,
        numComments: data.num_comments,
        url:         data.url,
        flair:       data.link_flair_text || null,
        createdAt:   new Date(data.created_utc * 1000),
        collectedAt: new Date(),
        category, // catégorie déterminée
    }
  });
}

async function fetchAllSubreddits() {
  const allPosts = [];

  for (const sub of TECH_SUBREDDITS) {
    try {
      console.log(`[Collector] Fetching r/${sub}...`);
      const posts = await fetchSubredditPosts(sub);
      allPosts.push(...posts);

      // Pause 5 secondes entre chaque requête
      // pour éviter d'être bloqué par Reddit
      await new Promise(r => setTimeout(r, 5000));

    } catch (err) {
      console.error(`[Collector] Erreur r/${sub}:`, err.message);
    }
  }

  console.log(`[Collector] Total collecté : ${allPosts.length} posts`);
  return allPosts;
}

module.exports = { fetchAllSubreddits, fetchSubredditPosts };