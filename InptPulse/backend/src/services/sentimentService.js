const POSITIVE = ['breakthrough', 'amazing', 'launched', 'new', 'faster', 
                  'better', 'open source', 'free', 'released', 'improved'];

const NEGATIVE = ['bug', 'broken', 'deprecated', 'attack', 'vulnerability',
                  'down', 'failed', 'ban', 'problem', 'malware'];

function analyzeSentiment(title) {
  const lower = title.toLowerCase();
  let score = 0;
  POSITIVE.forEach(w => lower.includes(w) && score++);
  NEGATIVE.forEach(w => lower.includes(w) && score--);
  return {
    sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
    sentimentScore: score
  };
}

module.exports = { analyzeSentiment };