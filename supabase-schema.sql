-- Market Signals Database Schema
-- Stock sentiment tracking with source credibility scoring

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Tickers: Stock symbols we're tracking
CREATE TABLE tickers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL UNIQUE,
  company_name TEXT,
  sector TEXT,
  industry TEXT,
  market_cap BIGINT,
  avg_daily_mentions INTEGER DEFAULT 0,
  mention_spike_threshold INTEGER DEFAULT 20, -- Alert when mentions exceed this
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources: People, outlets, analysts who make predictions
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'twitter', 'reddit', 'seeking_alpha', 'benzinga', 'cnbc', etc.
  username TEXT, -- Platform-specific handle/username
  source_type TEXT NOT NULL, -- 'individual', 'publication', 'analyst_firm', 'influencer'
  follower_count INTEGER DEFAULT 0,

  -- Credibility metrics
  credibility_score DECIMAL(5,2) DEFAULT 50.0, -- 0-100 scale
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2) DEFAULT 0.0, -- Percentage
  avg_days_to_target DECIMAL(8,2), -- How long their predictions typically take

  -- Source quality indicators (from prompt analysis)
  uses_data_sources BOOLEAN DEFAULT false, -- Do they cite actual documents/data?
  reasoning_quality DECIMAL(3,2) DEFAULT 0.0, -- 0-1 scale from prompt evaluation
  transparency_score DECIMAL(3,2) DEFAULT 0.0, -- 0-1 scale, do they admit uncertainty?

  -- Metadata
  bio TEXT,
  url TEXT,
  verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(platform, username)
);

-- Mentions: Raw detected mentions of tickers
CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker_id UUID NOT NULL REFERENCES tickers(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,

  -- Content
  content TEXT NOT NULL,
  url TEXT,
  platform TEXT NOT NULL,

  -- Metadata
  mentioned_at TIMESTAMPTZ NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  engagement_score INTEGER DEFAULT 0, -- Likes + retweets + replies, etc.

  -- Flags
  is_prediction BOOLEAN DEFAULT false, -- Does this contain a price target/timeframe?
  processed BOOLEAN DEFAULT false, -- Has this been analyzed for sentiment?

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions: Structured predictions extracted from mentions
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker_id UUID NOT NULL REFERENCES tickers(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  mention_id UUID REFERENCES mentions(id) ON DELETE SET NULL,

  -- The prediction
  sentiment TEXT NOT NULL CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  price_target DECIMAL(12,2), -- Optional target price
  timeframe_days INTEGER, -- Expected timeframe in days
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),

  -- Reasoning analysis (from prompts)
  reasoning TEXT,
  data_sources_cited TEXT[], -- Array of sources they referenced
  catalysts TEXT[], -- What they think will drive the move

  -- Quality scores (from prompt evaluation)
  reasoning_quality_score DECIMAL(3,2), -- 0-1, how well-reasoned
  data_discipline_score DECIMAL(3,2), -- 0-1, do they cite real data
  transparency_score DECIMAL(3,2), -- 0-1, do they admit uncertainty

  -- Tracking
  prediction_date TIMESTAMPTZ NOT NULL,
  target_date TIMESTAMPTZ, -- When they expect this to play out
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validations: Outcomes of predictions
CREATE TABLE validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,

  -- Price data
  price_at_prediction DECIMAL(12,2) NOT NULL,
  price_at_validation DECIMAL(12,2) NOT NULL,
  price_change_percent DECIMAL(6,2) NOT NULL,

  -- Outcome
  was_correct BOOLEAN NOT NULL,
  accuracy_score DECIMAL(5,2) NOT NULL, -- 0-100, how accurate was the prediction
  days_to_outcome INTEGER, -- How long did it take

  -- Metadata
  validation_date TIMESTAMPTZ NOT NULL,
  validation_method TEXT, -- 'target_date_reached', 'manual', 'timeout'
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mention Frequency Tracking: Aggregated daily mention counts
CREATE TABLE mention_frequency (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker_id UUID NOT NULL REFERENCES tickers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mention_count INTEGER DEFAULT 0,
  unique_sources INTEGER DEFAULT 0,
  avg_sentiment_score DECIMAL(4,2), -- -1 to +1 scale
  spike_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ticker_id, date)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_tickers_symbol ON tickers(symbol);
CREATE INDEX idx_tickers_active ON tickers(is_active) WHERE is_active = true;

CREATE INDEX idx_sources_platform_username ON sources(platform, username);
CREATE INDEX idx_sources_credibility ON sources(credibility_score DESC);
CREATE INDEX idx_sources_accuracy ON sources(accuracy_rate DESC);
CREATE INDEX idx_sources_active ON sources(is_active) WHERE is_active = true;

CREATE INDEX idx_mentions_ticker ON mentions(ticker_id);
CREATE INDEX idx_mentions_source ON mentions(source_id);
CREATE INDEX idx_mentions_mentioned_at ON mentions(mentioned_at DESC);
CREATE INDEX idx_mentions_platform ON mentions(platform);
CREATE INDEX idx_mentions_unprocessed ON mentions(processed) WHERE processed = false;

CREATE INDEX idx_predictions_ticker ON predictions(ticker_id);
CREATE INDEX idx_predictions_source ON predictions(source_id);
CREATE INDEX idx_predictions_date ON predictions(prediction_date DESC);
CREATE INDEX idx_predictions_sentiment ON predictions(sentiment);

CREATE INDEX idx_validations_prediction ON validations(prediction_id);
CREATE INDEX idx_validations_date ON validations(validation_date DESC);

CREATE INDEX idx_mention_frequency_ticker_date ON mention_frequency(ticker_id, date DESC);
CREATE INDEX idx_mention_frequency_spikes ON mention_frequency(spike_detected) WHERE spike_detected = true;

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tickers_updated_at BEFORE UPDATE ON tickers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update source credibility after validation
CREATE OR REPLACE FUNCTION update_source_credibility()
RETURNS TRIGGER AS $$
DECLARE
  source_uuid UUID;
BEGIN
  -- Get the source_id from the prediction
  SELECT source_id INTO source_uuid
  FROM predictions
  WHERE id = NEW.prediction_id;

  -- Update source stats
  UPDATE sources
  SET
    total_predictions = (
      SELECT COUNT(*) FROM predictions p
      JOIN validations v ON v.prediction_id = p.id
      WHERE p.source_id = source_uuid
    ),
    correct_predictions = (
      SELECT COUNT(*) FROM predictions p
      JOIN validations v ON v.prediction_id = p.id
      WHERE p.source_id = source_uuid AND v.was_correct = true
    ),
    accuracy_rate = (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE v.was_correct = true)::DECIMAL / COUNT(*)::DECIMAL) * 100,
        2
      )
      FROM predictions p
      JOIN validations v ON v.prediction_id = p.id
      WHERE p.source_id = source_uuid
    ),
    avg_days_to_target = (
      SELECT AVG(v.days_to_outcome)
      FROM predictions p
      JOIN validations v ON v.prediction_id = p.id
      WHERE p.source_id = source_uuid
    ),
    credibility_score = (
      -- Weighted formula: 70% accuracy + 20% volume + 10% reasoning quality
      SELECT LEAST(100, GREATEST(0,
        (
          (COUNT(*) FILTER (WHERE v.was_correct = true)::DECIMAL / COUNT(*)::DECIMAL) * 70 +
          (LEAST(COUNT(*), 50)::DECIMAL / 50) * 20 +
          (AVG(p.reasoning_quality_score) * 10)
        )
      ))
      FROM predictions p
      JOIN validations v ON v.prediction_id = p.id
      WHERE p.source_id = source_uuid
    )
  WHERE id = source_uuid;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_source_credibility
  AFTER INSERT ON validations
  FOR EACH ROW
  EXECUTE FUNCTION update_source_credibility();

-- =============================================================================
-- ROW LEVEL SECURITY (Optional - enable if using Supabase auth)
-- =============================================================================

-- Enable RLS
-- ALTER TABLE tickers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mention_frequency ENABLE ROW LEVEL SECURITY;

-- Public read access (customize as needed)
-- CREATE POLICY "Public read access" ON tickers FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON sources FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON mentions FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON predictions FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON validations FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON mention_frequency FOR SELECT USING (true);
