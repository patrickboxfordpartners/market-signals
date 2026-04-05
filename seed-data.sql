-- Seed data for Market Signals
-- Run this after running supabase-schema.sql

-- =============================================================================
-- SEED TICKERS
-- =============================================================================

INSERT INTO tickers (symbol, company_name, sector, industry, mention_spike_threshold, is_active)
VALUES
  -- Mega Cap Tech
  ('NVDA', 'NVIDIA Corporation', 'Technology', 'Semiconductors', 20, true),
  ('AAPL', 'Apple Inc', 'Technology', 'Consumer Electronics', 25, true),
  ('MSFT', 'Microsoft Corporation', 'Technology', 'Software', 25, true),
  ('GOOGL', 'Alphabet Inc', 'Technology', 'Internet', 20, true),
  ('AMZN', 'Amazon.com Inc', 'Consumer Cyclical', 'E-commerce', 20, true),
  ('META', 'Meta Platforms Inc', 'Technology', 'Social Media', 25, true),
  ('TSLA', 'Tesla Inc', 'Consumer Cyclical', 'Auto Manufacturers', 30, true),

  -- Other Tech
  ('AMD', 'Advanced Micro Devices', 'Technology', 'Semiconductors', 15, true),
  ('INTC', 'Intel Corporation', 'Technology', 'Semiconductors', 15, true),
  ('CRM', 'Salesforce Inc', 'Technology', 'Software', 10, true),
  ('ORCL', 'Oracle Corporation', 'Technology', 'Software', 10, true),
  ('AVGO', 'Broadcom Inc', 'Technology', 'Semiconductors', 10, true),

  -- Crypto/Fintech
  ('COIN', 'Coinbase Global Inc', 'Financial Services', 'Crypto Exchange', 15, true),
  ('SQ', 'Block Inc', 'Technology', 'Fintech', 10, true),
  ('HOOD', 'Robinhood Markets Inc', 'Financial Services', 'Brokerage', 10, true),

  -- AI/Cloud
  ('PLTR', 'Palantir Technologies', 'Technology', 'Software', 15, true),
  ('SNOW', 'Snowflake Inc', 'Technology', 'Cloud Software', 10, true),
  ('CRWD', 'CrowdStrike Holdings', 'Technology', 'Cybersecurity', 10, true),

  -- Biotech (WSB favorites)
  ('MRNA', 'Moderna Inc', 'Healthcare', 'Biotechnology', 15, true),
  ('BNTX', 'BioNTech SE', 'Healthcare', 'Biotechnology', 10, true),

  -- Meme Stocks
  ('GME', 'GameStop Corp', 'Consumer Cyclical', 'Retail', 20, true),
  ('AMC', 'AMC Entertainment', 'Consumer Cyclical', 'Entertainment', 20, true),

  -- EVs
  ('RIVN', 'Rivian Automotive', 'Consumer Cyclical', 'Auto Manufacturers', 10, true),
  ('LCID', 'Lucid Group Inc', 'Consumer Cyclical', 'Auto Manufacturers', 10, true),

  -- Other Popular
  ('NFLX', 'Netflix Inc', 'Communication Services', 'Streaming', 15, true),
  ('DIS', 'Walt Disney Co', 'Communication Services', 'Entertainment', 15, true),
  ('BA', 'Boeing Co', 'Industrials', 'Aerospace', 10, true),
  ('JPM', 'JPMorgan Chase & Co', 'Financial Services', 'Banking', 10, true),
  ('V', 'Visa Inc', 'Financial Services', 'Payment Processing', 10, true),
  ('WMT', 'Walmart Inc', 'Consumer Defensive', 'Retail', 10, true)
ON CONFLICT (symbol) DO NOTHING;

-- =============================================================================
-- SEED EXAMPLE SOURCES (for testing)
-- =============================================================================

INSERT INTO sources (name, platform, username, source_type, follower_count, credibility_score, verified)
VALUES
  -- High-credibility analysts
  ('Cathie Wood', 'twitter', 'CathieDWood', 'influencer', 1200000, 75.0, true),
  ('Chamath Palihapitiya', 'twitter', 'chamath', 'influencer', 900000, 72.0, true),
  ('Michael Burry', 'twitter', 'michaeljburry', 'influencer', 800000, 80.0, true),

  -- Medium-credibility
  ('Seeking Alpha', 'seeking_alpha', 'seekingalpha', 'publication', 500000, 65.0, true),
  ('Benzinga', 'benzinga', 'benzinga', 'publication', 300000, 62.0, true),

  -- Test accounts (for development)
  ('Test Analyst 1', 'twitter', 'test_analyst_1', 'individual', 5000, 50.0, false),
  ('Test Analyst 2', 'reddit', 'test_analyst_2', 'individual', 1000, 50.0, false)
ON CONFLICT (platform, username) DO NOTHING;

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- View: Recent mention activity
CREATE OR REPLACE VIEW recent_mentions AS
SELECT
  m.id,
  t.symbol,
  s.name as source_name,
  s.platform,
  m.content,
  m.engagement_score,
  m.is_prediction,
  m.processed,
  m.mentioned_at
FROM mentions m
JOIN tickers t ON t.id = m.ticker_id
LEFT JOIN sources s ON s.id = m.source_id
ORDER BY m.mentioned_at DESC;

-- View: Active predictions
CREATE OR REPLACE VIEW active_predictions AS
SELECT
  p.id,
  t.symbol,
  s.name as source_name,
  s.credibility_score,
  p.sentiment,
  p.price_target,
  p.timeframe_days,
  p.confidence_level,
  p.reasoning_quality_score,
  p.data_discipline_score,
  p.transparency_score,
  p.prediction_date,
  p.target_date,
  v.id IS NULL as pending_validation
FROM predictions p
JOIN tickers t ON t.id = p.ticker_id
JOIN sources s ON s.id = p.source_id
LEFT JOIN validations v ON v.prediction_id = p.id
ORDER BY p.prediction_date DESC;

-- View: Source leaderboard
CREATE OR REPLACE VIEW source_leaderboard AS
SELECT
  s.name,
  s.platform,
  s.source_type,
  s.follower_count,
  s.credibility_score,
  s.accuracy_rate,
  s.total_predictions,
  s.correct_predictions,
  s.reasoning_quality,
  s.transparency_score as transparency,
  s.verified,
  s.updated_at
FROM sources s
WHERE s.total_predictions > 0
ORDER BY s.credibility_score DESC;

-- View: Ticker spike summary
CREATE OR REPLACE VIEW ticker_spikes AS
SELECT
  t.symbol,
  t.company_name,
  mf.date,
  mf.mention_count,
  t.avg_daily_mentions,
  mf.unique_sources,
  mf.avg_sentiment_score,
  mf.spike_detected,
  ROUND((mf.mention_count::decimal / NULLIF(t.avg_daily_mentions, 0) - 1) * 100, 1) as spike_percent
FROM mention_frequency mf
JOIN tickers t ON t.id = mf.ticker_id
WHERE mf.spike_detected = true
ORDER BY mf.date DESC, spike_percent DESC;

-- View: Validation results summary
CREATE OR REPLACE VIEW validation_summary AS
SELECT
  t.symbol,
  s.name as source_name,
  s.credibility_score,
  p.sentiment,
  p.price_target,
  v.price_at_prediction,
  v.price_at_validation,
  v.price_change_percent,
  v.was_correct,
  v.accuracy_score,
  v.days_to_outcome,
  p.prediction_date,
  v.validation_date
FROM validations v
JOIN predictions p ON p.id = v.prediction_id
JOIN tickers t ON t.id = p.ticker_id
JOIN sources s ON s.id = p.source_id
ORDER BY v.validation_date DESC;

-- =============================================================================
-- USEFUL QUERIES
-- =============================================================================

-- Check system health
COMMENT ON VIEW recent_mentions IS 'Shows last 100 mentions with ticker and source info';
COMMENT ON VIEW active_predictions IS 'Shows all predictions with validation status';
COMMENT ON VIEW source_leaderboard IS 'Ranks sources by credibility score';
COMMENT ON VIEW ticker_spikes IS 'Shows detected mention spikes with percentage increase';
COMMENT ON VIEW validation_summary IS 'Shows prediction outcomes with accuracy';

-- After running this, try:
-- SELECT * FROM recent_mentions LIMIT 10;
-- SELECT * FROM source_leaderboard LIMIT 10;
-- SELECT * FROM ticker_spikes LIMIT 10;
