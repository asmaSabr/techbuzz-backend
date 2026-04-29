const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  redditId:    { type: String, unique: true, required: true },
  title:       String,
  subreddit:   String,
  score:       { type: Number, default: 0 },
  upvoteRatio: { type: Number, default: 0 },
  numComments: { type: Number, default: 0 },
  url:         String,
  flair:       String,
  keywords:    [String],
  createdAt:   Date,
  collectedAt: { type: Date, default: Date.now },
  sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
  sentimentScore: { type: Number, default: 0 },
  category: { type: String }, // 'AI', 'DevOps', 'Languages', 'Cloud', 'Database'
  momentum: { type: Number, default: 0 },
  collectedAt: { type: Date, default: Date.now },
});

postSchema.index({ collectedAt: -1 });
postSchema.index({ subreddit: 1, score: -1 });
postSchema.index({ keywords: 1 });

module.exports = mongoose.model('Post', postSchema);