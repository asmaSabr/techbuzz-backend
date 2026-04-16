const mongoose = require('mongoose');

const TrendSnapshotSchema = new mongoose.Schema({
  keyword:       { type: String, required: true },
  count:         { type: Number, default: 0 },
  totalScore:    { type: Number, default: 0 },
  avgScore:      { type: Number, default: 0 },
  momentum:      { type: Number, default: 0 },
  avgSentiment:  { type: Number, default: 0 },
  sentimentDistribution: {
    positive: { type: Number, default: 0 },
    negative: { type: Number, default: 0 },
    neutral:  { type: Number, default: 0 },
  },
  category:      { type: String },
  snapshotAt:    { type: Date, default: Date.now },

},{
  collection: 'trend_snapshots'
});

// Index pour retrouver l’évolution d’un mot-clé
TrendSnapshotSchema.index({ keyword: 1, snapshotAt: -1 });
// Index pour analyser par catégorie
TrendSnapshotSchema.index({ category: 1, snapshotAt: -1 });

module.exports = mongoose.model('TrendSnapshot', TrendSnapshotSchema);
