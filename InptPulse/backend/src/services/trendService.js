const EnrichedPost = require('../models/EnrichedPost');

// ─────────────────────────────────────────────
// TF-IDF : extraction de keywords sans stopwords
// ─────────────────────────────────────────────
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !/^\d+$/.test(w));
}

function computeTFIDF(titles) {
  const tokenizedTitles = titles.map(tokenize);
  const N = tokenizedTitles.length;

  // IDF : nombre de documents contenant chaque mot
  const docFreq = {};
  for (const tokens of tokenizedTitles) {
    const unique = new Set(tokens);
    for (const word of unique) {
      docFreq[word] = (docFreq[word] || 0) + 1;
    }
  }

  const result = new Map();

  titles.forEach((title, i) => {
    const tokens = tokenizedTitles[i];
    if (tokens.length === 0) {
      result.set(title, []);
      return;
    }

    // TF
    const tf = {};
    for (const word of tokens) {
      tf[word] = (tf[word] || 0) + 1 / tokens.length;
    }

    // Score TF-IDF
    const scores = Object.entries(tf).map(([word, tfScore]) => {
      const idf = Math.log(N / (docFreq[word] || 1));
      return { word, score: tfScore * idf };
    });

    // Top 6 keywords par score décroissant, score > 0 uniquement
    const keywords = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .filter(({ score }) => score > 0)
      .map(({ word }) => word);

    result.set(title, keywords);
  });

  return result;
}

// ─────────────────────────────────────────────
// extractKeywords : utilisé par le NLP Worker
// (TF-IDF sur un seul titre = fallback simple)
// ─────────────────────────────────────────────
function extractKeywords(title) {
  if (!title) return [];
  return tokenize(title);
}

// ─────────────────────────────────────────────
// computeTrends : appelé par le Trend Worker
// ─────────────────────────────────────────────
async function computeTrends(hoursBack = 24) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const posts = await EnrichedPost.find({ enrichedAt: { $gte: since } });
  const recentPosts = await EnrichedPost.find({ enrichedAt: { $gte: oneHourAgo } });

  if (posts.length === 0) return [];

  // 1. TF-IDF sur le corpus complet
  const titles = posts.map(p => p.title || p.content || '');
  const tfidfMap = computeTFIDF(titles);

  // 2. Momentum : keywords récents
  const recentTitles = recentPosts.map(p => p.title || p.content || '');
  const recentTfidfMap = computeTFIDF(recentTitles);

  const recentMap = {};
  for (const keywords of recentTfidfMap.values()) {
    for (const kw of keywords) {
      recentMap[kw] = (recentMap[kw] || 0) + 1;
    }
  }

  // 3. Agrégation des tendances
  const map = {};

  posts.forEach((post, i) => {
    const keywords = tfidfMap.get(titles[i]) || [];

    for (const kw of keywords) {
      if (!map[kw]) {
        map[kw] = {
          keyword: kw,
          count: 0,
          totalScore: 0,
          recentCount: recentMap[kw] || 0,
          sentimentScores: [],
          sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
          category: post.category || null,
        };
      }
      map[kw].count++;
      map[kw].totalScore += post.engagementScore || 0;
      map[kw].sentimentScores.push(post.sentimentScore || 0);

      if (post.sentiment === 'positive')       map[kw].sentimentDistribution.positive++;
      else if (post.sentiment === 'negative')  map[kw].sentimentDistribution.negative++;
      else                                     map[kw].sentimentDistribution.neutral++;
    }
  });

  // 4. Calcul final + tri
  return Object.values(map)
    .map(d => {
      const avgScore   = d.count > 0 ? Math.round(d.totalScore / d.count) : 0;
      const momentum   = d.count > 0 ? Math.round((d.recentCount / d.count) * 100) : 0;
      const avgSentiment = d.sentimentScores.length > 0
        ? d.sentimentScores.reduce((a, b) => a + b, 0) / d.sentimentScores.length
        : 0;

      return {
        keyword:              d.keyword,
        count:                d.count,
        totalScore:           d.totalScore,
        avgScore,
        momentum,
        avgSentiment:         Math.round(avgSentiment * 100) / 100,
        sentimentDistribution: d.sentimentDistribution,
        category:             d.category,
      };
    })
    .filter(d => d.count >= 2)
    .sort((a, b) => (b.totalScore + b.momentum * 10) - (a.totalScore + a.momentum * 10))
    .slice(0, 40);
}

module.exports = { extractKeywords, computeTrends };