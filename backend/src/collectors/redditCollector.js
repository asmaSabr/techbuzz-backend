require('dotenv').config();
const axios = require('axios');
const { getCategory } = require('../services/categoryService');
const { addRawPosts } = require('../queues/postQueue');
const RawPost = require('../models/RawPost');
const logger = require('../utils/logger');



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
    
    const category = getCategory([data.subreddit.toLowerCase()]);

    return {
        redditId:    data.id,
        title:       data.title,
        content:     data.selftext || null,
        author:      data.author,
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
  let allPosts = [];

  for (const sub of TECH_SUBREDDITS) {
    try {
      logger.info(`[Collector] Fetching r/${sub}...`);
      const posts = await fetchSubredditPosts(sub);
      logger.info(`[Collector] r/${sub} → ${posts.length} posts collectés`);

      // 👉 Envoie dans la Raw Queue
      const addedCount = await addRawPosts(posts);
      logger.info(`[Collector] r/${sub} → ${addedCount} posts envoyés dans raw_posts`);

      // 👉 Enregistre aussi dans MongoDB
      for (const p of posts) {
        await saveRawPost(p);
      }

      // 👉 Ajoute au tableau global
      allPosts.push(...posts);

      // Pause pour éviter le blocage par Reddit
      await new Promise(r => setTimeout(r, 5000));

    } catch (err) {
      logger.error(`[Collector] Erreur r/${sub}:`, err.message); 
    }
  }

  logger.info(`[Collector] Total collecté: ${allPosts.length} posts`);
  return allPosts; // 👉 retourne un tableau de posts valides
}


  // Fonction d'insertion dans RawPost Base de données (non utilisée directement, mais peut être utile pour tests ou autres usages)
  async function saveRawPost(redditPost) {
  try {
    const post = new RawPost({
      redditId: redditPost.redditId,
      title: redditPost.title,
      content: redditPost.selftext || null,
      author: redditPost.author,
      subreddit: redditPost.subreddit,
      scoreRaw: redditPost.score,
      upvoteRatio: redditPost.upvote_ratio,
      numComments: redditPost.num_comments,
      url: redditPost.url,
      flair: redditPost.link_flair_text,
      createdAt: redditPost.createdAt,
      collectedAt: redditPost.collectedAt,
    });

    await post.save();
    logger.info(`[Collector] Post ${redditPost.redditId} inséré dans posts_raw`);
  } catch (err) {
    if (err.code === 11000) {
      logger.info(`[Collector] Post ${redditPost.redditId} déjà existant`);
    } else {
      logger.error('[Collector] Erreur insertion:', err.message);
    }
  }
}

module.exports = { fetchAllSubreddits, fetchSubredditPosts };