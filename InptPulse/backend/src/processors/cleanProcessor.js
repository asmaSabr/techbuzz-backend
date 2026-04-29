const logger = require('../utils/logger');

function normalizeText(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')           // espaces multiples
    .replace(/[^\w\s\-\/\.\,]/g, '') // caractères spéciaux
    .toLowerCase();
}

function isValidPost(post) {
  return (
    post.redditId &&
    post.title    &&
    post.title.length > 5 &&
    post.scoreRaw !== undefined && post.scoreRaw !== null &&
    post.subreddit
  );
}

function cleanPost(post) {
  if (!isValidPost(post)) {
    logger.info(`[CleanProcessor] Post rejeté: redditId=${post.redditId || 'N/A'} | title="${post.title}" | scoreRaw=${post.scoreRaw}`);
    return null;
  }

  const cleaned = {
    ...post,
    title:        post.title.trim(),
    titleNorm:    normalizeText(post.title),
    subreddit:    post.subreddit.toLowerCase(),
    score:        Math.max(0, post.scoreRaw), // utilise scoreRaw
    upvoteRatio:  Math.min(1, Math.max(0, post.upvoteRatio || 0)),
    numComments:  Math.max(0, post.numComments || 0),
    cleanedAt:    new Date(),
  };

  logger.info(`[CleanProcessor] Post accepté: redditId=${cleaned.redditId} | subreddit=${cleaned.subreddit} | score=${cleaned.score}`);
  return cleaned;
}

module.exports = { cleanPost, isValidPost, normalizeText };