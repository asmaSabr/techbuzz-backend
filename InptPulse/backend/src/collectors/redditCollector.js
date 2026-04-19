require('dotenv').config();
const axios = require('axios');
const { getCategory } = require('../services/categoryService');
const { addRawPosts } = require('../queues/postQueue');
const RawPost = require('../models/RawPost');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────
// LISTE DES SUBREDDITS TECH (sources de collecte)
// ─────────────────────────────────────────────
const TECH_SUBREDDITS = [
  'programming', 'webdev', 'MachineLearning', 'javascript', 'Python',
  'artificial', 'devops', 'opensource', 'reactjs', 'node', 'typescript',
  'rust', 'golang', 'aws', 'docker', 'kubernetes', 'datascience',
  'deeplearning', 'github', 'linux', 'cybersecurity', 'cloudcomputing',
  'mongodb', 'postgresql', 'sql', 'database', 'frontend', 'backend',
  'fullstack', 'webassembly', 'claudeai', 'gemini', 'chatgpt', 'llm',
  'Java', 'kotlin', 'swift', 'scala', 'cpp', 'angular', 'nextjs',
  'svelte', 'fastapi', 'django', 'flask', 'spring', 'laravel',
  'SpringBoot', 'web3', 'microservices', 'serverless',
];

// ─────────────────────────────────────────────
// HEADERS HTTP pour l'API Reddit
// ─────────────────────────────────────────────
const HEADERS = {
  'User-Agent': 'TechBuzzTracker/1.0 (educational project)',
  'Accept': 'application/json',
};

// ─────────────────────────────────────────────
// FILTRE IT "SOFT" (élimine le bruit avant traitement)
// ─────────────────────────────────────────────
const IT_SIGNAL_KEYWORDS = new Set([
  'code', 'function', 'api', 'library', 'framework', 'package', 'module',
  'error', 'bug', 'debug', 'deploy', 'build', 'compile', 'runtime',
  'algorithm', 'data structure', 'complexity', 'optimization',
  'database', 'query', 'index', 'schema', 'migration',
  'authentication', 'authorization', 'encryption', 'security',
  'docker', 'kubernetes', 'aws', 'azure', 'cloud', 'serverless',
  'react', 'vue', 'angular', 'node', 'python', 'rust', 'typescript',
  'llm', 'ai', 'machine learning', 'neural', 'transformer', 'embedding'
]);

const NON_TECH_SIGNALS = [
  /just (quit|got hired|got fired|promoted|started)/i,
  /ama|ask me anything/i,
  /rant|unpopular opinion|hot take|change my view/i,
  /meme|funny|lol|😂|🤣|💀/i,
  /salary|compensation|benefits|negotiate|pay raise/i,
  /interview|job offer|recruiter|hiring process/i,
  /career advice|should i learn|which language/i
];

/**
 * Filtre "soft" pour garder uniquement les posts techniquement pertinents
 * @param {Object} post - Post Reddit brut
 * @returns {Object} { relevant: boolean, reason: string, score?: number }
 */
function isTechnicallyRelevant(post) {
  const text = `${post.title} ${post.content || ''}`.toLowerCase();
  
  // 1. Rejet rapide des signaux "non-tech" (lifestyle, memes, career...)
  if (NON_TECH_SIGNALS.some(pattern => pattern.test(text))) {
    return { relevant: false, reason: 'non_tech_signal' };
  }
  
  // 2. Compter les mots-clés techniques dans le contenu
  const words = text.match(/\b\w+\b/g) || [];
  const techMatches = words.filter(w => IT_SIGNAL_KEYWORDS.has(w)).length;
  
  // 3. Vérifier si le titre contient déjà un signal tech fort
  const titleWords = (post.title || '').toLowerCase().match(/\b\w+\b/g) || [];
  const titleHasTech = titleWords.slice(0, 15).some(w => IT_SIGNAL_KEYWORDS.has(w));
  
  // 4. Décision : au moins 2 signaux tech OU 1 signal + titre technique
  if (techMatches >= 2 || (techMatches >= 1 && titleHasTech)) {
    return { relevant: true, reason: 'tech_keywords', score: techMatches };
  }
  
  // 5. Contenu trop court pour être analysé (< 50 caractères)
  if (text.replace(/\s+/g, '').length < 50) {
    return { relevant: false, reason: 'too_short' };
  }
  
  // 6. Par défaut : pas assez de signaux techniques détectés
  return { relevant: false, reason: 'low_tech_signal' };
}

// ─────────────────────────────────────────────
// FETCH DES POSTS D'UN SUBREDDIT
// ─────────────────────────────────────────────
async function fetchSubredditPosts(subreddit, limit = 100) {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
  
  const res = await axios.get(url, { headers: HEADERS, timeout: 10000 });
  const posts = res.data.data.children;

  return posts.map(({ data }) => {
    const category = getCategory([data.subreddit.toLowerCase()]);

    return {
      redditId:    data.id,
      title:       data.title,
      content:     data.selftext || null,
      author:      data.author,
      subreddit:   data.subreddit,
      scoreRaw:    data.score,
      scoreNorm:   Math.max(0, data.score),
      upvoteRatio: data.upvote_ratio,
      numComments: data.num_comments,
      url:         data.url,
      flair:       data.link_flair_text || null,
      createdAt:   new Date(data.created_utc * 1000),
      collectedAt: new Date(),
      category,
    };
  });
}

// ─────────────────────────────────────────────
// SAUVEGARDE DANS MONGODB (pour audit/debug)
// ─────────────────────────────────────────────
async function saveRawPost(redditPost) {
  try {
    const post = new RawPost({
      redditId: redditPost.redditId,
      title: redditPost.title,
      content: redditPost.content,
      author: redditPost.author,
      subreddit: redditPost.subreddit,
      scoreRaw: redditPost.scoreRaw,
      upvoteRatio: redditPost.upvoteRatio,
      numComments: redditPost.numComments,
      url: redditPost.url,
      flair: redditPost.flair,
      createdAt: redditPost.createdAt,
      collectedAt: redditPost.collectedAt,
      category: redditPost.category,
    });

    await post.save();
    logger.debug(`[DB] Post ${redditPost.redditId} inséré dans posts_raw`);
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key - normal en cas de re-collecte
      logger.debug(`[DB] Post ${redditPost.redditId} déjà existant (skip)`);
    } else {
      logger.error(`[DB] Erreur insertion post ${redditPost.redditId}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────
// COLLECTE PRINCIPALE (avec filtrage intégré)
// ─────────────────────────────────────────────
async function fetchAllSubreddits() {
  let allPosts = [];
  let filteredCount = 0;
  let errorCount = 0;

  logger.info(`[Collector] Démarrage collecte sur ${TECH_SUBREDDITS.length} subreddits...`);

  for (const sub of TECH_SUBREDDITS) {
    try {
      logger.info(`[Collector] Fetching r/${sub}...`);
      
      const posts = await fetchSubredditPosts(sub);
      logger.debug(`[Collector] r/${sub} → ${posts.length} posts bruts collectés`);

      // 👉 FILTRAGE "SOFT" : garder uniquement les posts techniquement pertinents
      const relevantPosts = posts.filter(post => {
        const check = isTechnicallyRelevant(post);
        if (!check.relevant) {
          filteredCount++;
          // Log en debug pour ne pas spammer la console
          logger.debug(`[Filter] Rejeté [${check.reason}]: "${post.title.slice(0, 60)}..."`);
          return false;
        }
        return true;
      });
      
      logger.info(`[Collector] r/${sub} → ${posts.length} bruts, ${relevantPosts.length} pertinents (${Math.round(relevantPosts.length/posts.length*100)}%)`);

      // 👉 Envoie SEULEMENT les posts pertinents dans la queue de traitement
      if (relevantPosts.length > 0) {
        try {
          const addedCount = await addRawPosts(relevantPosts);
          logger.info(`[Queue] r/${sub} → ${addedCount} posts envoyés dans raw_posts`);
        } catch (queueErr) {
          logger.error(`[Queue] Erreur envoi r/${sub}:`, queueErr.message);
          errorCount++;
        }
      }

      // 👉 Enregistre TOUS les posts (bruts) dans MongoDB pour audit/debug
      // (utile pour analyser les faux négatifs du filtre plus tard)
      for (const p of posts) {
        await saveRawPost(p);
      }

      // Ajoute les posts pertinents au résultat global
      allPosts.push(...relevantPosts);
      
      // Pause anti-rate-limit Reddit (2s entre chaque subreddit)
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (err) {
      errorCount++;
      logger.error(`[Collector] Erreur critique r/${sub}:`, {
        message: err.message,
        code: err.code,
        status: err.response?.status
      });
      
      // Continue avec le subreddit suivant (ne pas bloquer toute la collecte)
      continue;
    }
  }

  // 📊 Résumé final
  const totalCollected = allPosts.length + filteredCount;
  logger.info(`[Collector] ✅ Terminé: ${allPosts.length} posts pertinents / ${filteredCount} filtrés / ${errorCount} erreurs`);
  
  if (totalCollected > 0) {
    logger.info(`[Collector] Taux de pertinence: ${Math.round(allPosts.length/totalCollected*100)}%`);
  }
  
  return allPosts;
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────
module.exports = { 
  fetchAllSubreddits, 
  fetchSubredditPosts,
  isTechnicallyRelevant, // Exporté pour tests unitaires
  TECH_SUBREDDITS 
};