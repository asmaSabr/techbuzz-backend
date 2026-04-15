require('dotenv').config();
const express = require('express');
const http = require('http');
const connectDB = require('./config/db');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/use/ws');
const { connectRedis } = require('./config/redis');
const { publishTrends, getLatestTrends } = require('./services/redisService');
const { startScheduler } = require('./services/scheduler');
const { typeDefs } = require('./graphql/schema');
const { resolvers } = require('./graphql/resolvers');

const app = express();
const server = http.createServer(app);


async function start() {
  // MongoDB
   await connectDB();

  // Redis
  await connectRedis();

  // Schema GraphQL
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // WebSocket pour Subscriptions
  const wsServer = new WebSocketServer({ server, path: '/graphql' });
  useServer({ schema }, wsServer);
  console.log('[GraphQL] WebSocket Subscriptions actif');

  // Apollo Server
  const apolloServer = new ApolloServer({ schema });
  await apolloServer.start();

  app.use('/graphql', cors(), express.json(), expressMiddleware(apolloServer));
  console.log('[GraphQL] Apollo Server actif sur /graphql');

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

  server.listen(process.env.PORT || 3001, () => {
    console.log(`[Express] Serveur actif sur http://localhost:${process.env.PORT || 3001}`);
  });
}

start().catch(console.error);