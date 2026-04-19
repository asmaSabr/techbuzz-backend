const { extractKeywords }   = require('../services/trendService');
const { analyzeSentiment }  = require('../services/sentimentService');
const { getCategory }       = require('../services/categoryService');

/**
 * Enrichit un post nettoyé avec des informations NLP
 * @param {Object} post - Post nettoyé (provenant du CleanWorker)
 * @returns {Object} enriched post
 */
function enrichPost(post) {
  // 1. Extraction des mots-clés
  const keywords = extractKeywords(post.title || post.content);

  // 2. Analyse de sentiment
  const { sentiment, sentimentScore } = analyzeSentiment(post.title || post.content);

  // 3. Classification par catégorie
  const category = getCategory(keywords);

  // 4. Calcul du score d'engagement
  const engagementScore = Math.log1p(post.scoreNorm || 0) *
    (1 + (post.upvoteRatio || 0)) *
    Math.log1p((post.numComments || 0) + 1);

  // 5. Retourne l’objet enrichi
  return {
    ...post,
    keywords,
    sentiment,
    sentimentScore,
    category,
    engagementScore: Math.round(engagementScore * 100) / 100,
    enrichedAt: new Date(),
  };
}

module.exports = { enrichPost };
