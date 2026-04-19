const mongoose = require('mongoose');

const RawPostSchema = new mongoose.Schema({
  redditId:    { type: String, required: true, index: true },
  title:       { type: String, required: true },
  content:     { type: String },
  author:      { type: String },
  subreddit:   { type: String, required: true, index: true },
  scoreRaw:    { type: Number },
  upvoteRatio: { type: Number },
  numComments: { type: Number },
  url:         { type: String },
  flair:       { type: String },
  createdAt:   { type: Date },       // date du post sur Reddit
  collectedAt: { type: Date, default: Date.now }, // date de collecte
}, {
  collection: 'posts_raw'
});

module.exports = mongoose.model('RawPost', RawPostSchema);
