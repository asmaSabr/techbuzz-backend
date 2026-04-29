-- Extension TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Table des trends (hypertable pour time-series)
CREATE TABLE IF NOT EXISTS trend_snapshots (
    time TIMESTAMPTZ NOT NULL,
    keyword VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    volume INTEGER NOT NULL,
    velocity DECIMAL(10,4),
    acceleration DECIMAL(10,4),
    z_score DECIMAL(10,4),
    trend_score DECIMAL(10,4),
    engagement_avg DECIMAL(10,4),
    sentiment_avg DECIMAL(10,4),
    sources JSONB
);

-- Conversion en hypertable (partitionnement automatique par temps)
SELECT create_hypertable('trend_snapshots', 'time', if_not_exists => true);

-- Index pour performance des requêtes
CREATE INDEX IF NOT EXISTS idx_trends_keyword_time 
  ON trend_snapshots(keyword, time DESC);

CREATE INDEX IF NOT EXISTS idx_trends_score 
  ON trend_snapshots(trend_score DESC, time DESC);

-- Table des prédictions
CREATE TABLE IF NOT EXISTS trend_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(100) NOT NULL,
    predicted_at TIMESTAMPTZ NOT NULL,
    prediction_horizon INTERVAL,
    predicted_volume INTEGER,
    predicted_score DECIMAL(10,4),
    confidence DECIMAL(5,4),
    model_version VARCHAR(20),
    features JSONB
);

CREATE INDEX IF NOT EXISTS idx_predictions_keyword 
  ON trend_predictions(keyword, predicted_at DESC);