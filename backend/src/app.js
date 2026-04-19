require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/use/ws');

const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const { startScheduler } = require('./services/scheduler');
const { typeDefs } = require('./graphql/schema');
const { resolvers } = require('./graphql/resolvers');

const app = express();
const server = http.createServer(app);

const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { createBullBoard } = require('@bull-board/api');
const { ExpressAdapter } = require('@bull-board/express');

const { rawQueue, processedQueue, enrichedQueue } = require('./queues/postQueue');
const { metrics, registry } = require('./monitoring/metrics');
const logger = require('./utils/logger');

// Crée l’adaptateur Express
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Crée le dashboard Bull Board
createBullBoard({
  queues: [
    new BullMQAdapter(rawQueue),
    new BullMQAdapter(processedQueue),
    new BullMQAdapter(enrichedQueue),
  ],
  serverAdapter,
});

// Route pour accéder au dashboard
app.use('/admin/queues', serverAdapter.getRouter());


async function start() {
  // MongoDB
  await connectDB();
  metrics.mongoConnected.set(1);
  // Redis
  await connectRedis();

  // Schema GraphQL
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // WebSocket pour Subscriptions
  const wsServer = new WebSocketServer({ server, path: '/graphql' });
  useServer({ schema }, wsServer);
  logger.info('[GraphQL] WebSocket Subscriptions actif');

  app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (err) {
    logger.error(`[Metrics] ${err.message}`);
    res.status(500).end(err.message);
  }
});
  // Apollo Server
  const apolloServer = new ApolloServer({ schema });
  await apolloServer.start();

  app.use('/graphql', cors(), express.json(), expressMiddleware(apolloServer));
  logger.info('[GraphQL] Apollo Server actif sur /graphql');

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    graphql: 'http://localhost:3001/graphql',
    health: 'http://localhost:3001/health'
        });
    });

  // Scheduler
  startScheduler();
  // Workers
  require('./workers/cleanWorker');
  require('./workers/nlpWorker');
  require('./workers/trendWorker');


  server.listen(process.env.PORT || 3001, () => {
    logger.info(`[Express] Serveur actif sur http://localhost:${process.env.PORT || 3001}`);
  });
}

start().catch(logger.error);