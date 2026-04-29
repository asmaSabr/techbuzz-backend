const Post = require('../models/Post');
const { getLatestTrends, subscriber } = require('../services/redisService');
const { PubSub } = require('graphql-subscriptions');

const pubsub = new PubSub();

// Quand Redis reçoit un update → on forward à GraphQL Subscriptions
subscriber.subscribe('trends:update', (message) => {
  pubsub.publish('TRENDS_UPDATED', {
    trendsUpdated: JSON.parse(message)
  });
});

const resolvers = {
  Query: {
    currentTrends: async () => {
      return await getLatestTrends() || [];
    },
    history: async (_, { limit = 50 }) => {
      return await Post.find().sort({ createdAt: -1 }).limit(limit);
    },
    bySubreddit: async (_, { name }) => {
      return await Post.find({ subreddit: name }).sort({ createdAt: -1 }).limit(20);
    }
  },
  Subscription: {
    trendsUpdated: {
      subscribe: () => pubsub.asyncIterator(['TRENDS_UPDATED'])
    }
  }
};

module.exports = { resolvers, pubsub };