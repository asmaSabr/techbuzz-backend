const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('../utils/logger');


async function connectDB() {
  try {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('[MongoDB] Connecté');
 }catch (err) {
    logger.error('[DB] Erreur de connexion:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;