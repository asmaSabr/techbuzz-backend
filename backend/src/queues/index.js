const { Queue, Worker, QueueEvents } = require('bullmq');
const logger = require('../utils/logger');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

// Factory pour créer des queues
function createQueue(name, opts = {}) {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },  // garde les 100 derniers jobs
      removeOnFail:     { count: 50 },   // garde les 50 derniers échecs
    },
    ...opts,
  });
}

// Factory pour créer des workers
function createWorker(name, processor, opts = {}) {
  const worker = new Worker(name, processor, {
    connection,
    concurrency: 5,  // 5 jobs en parallèle
    ...opts,
  });

  // Logs standards pour tous les workers
  worker.on('completed', job => {
    logger.info(`[${name}] ✓ Job ${job.id} complété`);
  });
  worker.on('failed', (job, err) => {
    logger.error(`[${name}] ✗ Job ${job.id} échoué:`, err.message);
  });
  worker.on('error', err => {
    logger.error(`[${name}] Erreur worker:`, err.message);
  });

  return worker;
}

module.exports = { createQueue, createWorker, connection };