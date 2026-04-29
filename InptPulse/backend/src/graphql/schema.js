const { gql } = require('graphql-tag');

const typeDefs = gql`
  type TopPost {
    title: String
    score: Int
    url: String
  }

 type Trend {
  keyword: String
  count: Int
  totalScore: Int
  avgScore: Int
  totalComments: Int
  momentum: Int          
  avgSentiment: Float    
  subreddits: [String]
  topPost: TopPost
}

  type TrendSnapshot {
    keyword: String
    count: Int
    totalScore: Int
    avgScore: Int
    momentum: Int
    avgSentiment: Float
    category: String
    snapshotAt: String
  }

  type Post {
    title: String
    score: Int
    subreddit: String
    keywords: [String]
    createdAt: String
  }

  type Query {
    currentTrends: [Trend]
    history(limit: Int): [Post]
    bySubreddit(name: String): [Post]
    trendHistory(keyword: String!, days: Int): [TrendSnapshot]
    allSnapshots(days: Int): [TrendSnapshot]
  }

  type Subscription {
    trendsUpdated: [Trend]
  }
`;

module.exports = { typeDefs };