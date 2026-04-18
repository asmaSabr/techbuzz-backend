const client = require('prom-client');

client.collectDefaultMetrics({ prefix: 'techbuzz_' });

const metrics = {
  postsCollected: new client.Counter({
    name: 'techbuzz_posts_collected_total',
    help: 'Total posts collectés depuis Reddit'
  }),
  jobsProcessed: new client.Counter({
    name: 'techbuzz_jobs_processed_total',
    help: 'Jobs BullMQ traités',
    labelNames: ['worker', 'status']
  }),
  jobsFailed: new client.Counter({
    name: 'techbuzz_jobs_failed_total',
    help: 'Jobs BullMQ échoués',
    labelNames: ['worker']
  }),
  trendsComputed: new client.Gauge({
    name: 'techbuzz_trends_computed',
    help: 'Nombre de tendances calculées'
  }),
  jobDuration: new client.Histogram({
    name: 'techbuzz_job_duration_seconds',
    help: 'Durée traitement jobs en secondes',
    labelNames: ['worker'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),
  queueSize: new client.Gauge({
    name: 'techbuzz_queue_size',
    help: 'Taille des queues BullMQ',
    labelNames: ['queue']
  }),
  redisConnected: new client.Gauge({
    name: 'techbuzz_redis_connected',
    help: 'Redis connecté — 1=oui 0=non'
  }),
  mongoConnected: new client.Gauge({
    name: 'techbuzz_mongo_connected',
    help: 'MongoDB connecté — 1=oui 0=non'
  }),
};

module.exports = { metrics, registry: client.register };