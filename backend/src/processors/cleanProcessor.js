// Logique pure — pas de side effects, facile à tester
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
    post.score    >= 0 &&
    post.subreddit
  );
}

function cleanPost(post) {
  if (!isValidPost(post)) return null;

  return {
    ...post,
    title:        post.title.trim(),
    titleNorm:    normalizeText(post.title),  // version normalisée pour NLP
    subreddit:    post.subreddit.toLowerCase(),
    score:        Math.max(0, post.score),
    upvoteRatio:  Math.min(1, Math.max(0, post.upvoteRatio || 0)),
    numComments:  Math.max(0, post.numComments || 0),
    cleanedAt:    new Date(),
  };
}

module.exports = { cleanPost, isValidPost, normalizeText };