const mongoose = require('mongoose');

const EnrichedPostSchema = new mongoose.Schema({
  redditId:       { type: String, required: true, unique: true },
  sentiment:      { type: String }, // ex: 'positive', 'negative', 'neutral'
  sentimentScore: { type: Number }, // score numérique du sentiment
  keywords:       [{ type: String }], // liste de mots-clés extraits
  category:       { type: String },   // catégorie NLP
  engagementScore:{ type: Number },   // score d'engagement calculé
  enrichedAt:     { type: Date, default: Date.now },
}, {
  collection: 'posts_enriched'
});

module.exports = mongoose.model('EnrichedPost', EnrichedPostSchema);
