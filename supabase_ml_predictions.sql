-- Machine Learning Predictions Schema

-- Model predictions table
CREATE TABLE IF NOT EXISTS model_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID REFERENCES tickers(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL, -- 'price_movement_24h', 'price_movement_7d', 'spike_forecast'

  -- Prediction details
  prediction_direction TEXT, -- 'up', 'down', 'neutral'
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  predicted_magnitude DECIMAL(5,2), -- Expected % change (e.g., 3.5 for +3.5%)

  -- Features used (for interpretability)
  features JSONB, -- { mention_delta: 45, sentiment_ratio: 0.72, source_credibility_avg: 0.68 }

  -- Model metadata
  model_version TEXT,
  trained_at TIMESTAMPTZ,

  -- Validation (filled in after prediction window)
  actual_direction TEXT, -- 'up', 'down', 'neutral'
  actual_magnitude DECIMAL(5,2),
  was_correct BOOLEAN,
  validated_at TIMESTAMPTZ,

  prediction_date TIMESTAMPTZ NOT NULL,
  target_date TIMESTAMPTZ NOT NULL, -- When this prediction is for
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(ticker_id, model_type, prediction_date)
);

-- Model configuration and performance metrics
CREATE TABLE IF NOT EXISTS model_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL,
  model_version TEXT NOT NULL,

  -- Model parameters
  config JSONB NOT NULL, -- Stores model weights, hyperparameters, etc.

  -- Training metadata
  training_samples INT,
  training_date_range TSTZRANGE,

  -- Performance metrics
  accuracy DECIMAL(4,3), -- Overall accuracy (0.000 to 1.000)
  precision DECIMAL(4,3),
  recall DECIMAL(4,3),
  f1_score DECIMAL(4,3),

  -- Per-class metrics
  metrics_by_class JSONB, -- { up: { precision: 0.75, recall: 0.68 }, down: { ... } }

  is_active BOOLEAN DEFAULT true,
  trained_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(model_type, model_version)
);

-- Training data cache (for faster retraining)
CREATE TABLE IF NOT EXISTS model_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker_id UUID REFERENCES tickers(id) ON DELETE CASCADE,

  -- Feature vector
  features JSONB NOT NULL,

  -- Target (what we're predicting)
  target_direction TEXT NOT NULL, -- 'up', 'down', 'neutral'
  target_magnitude DECIMAL(5,2) NOT NULL,

  -- Time reference
  observation_date DATE NOT NULL,
  target_date DATE NOT NULL, -- Date of the actual price movement

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(ticker_id, observation_date, target_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_predictions_ticker ON model_predictions(ticker_id);
CREATE INDEX IF NOT EXISTS idx_model_predictions_type ON model_predictions(model_type);
CREATE INDEX IF NOT EXISTS idx_model_predictions_date ON model_predictions(prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_model_predictions_target ON model_predictions(target_date);
CREATE INDEX IF NOT EXISTS idx_model_predictions_validation ON model_predictions(was_correct, validated_at);

CREATE INDEX IF NOT EXISTS idx_model_configs_type ON model_configs(model_type, is_active);
CREATE INDEX IF NOT EXISTS idx_model_configs_trained ON model_configs(trained_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_data_ticker ON model_training_data(ticker_id);
CREATE INDEX IF NOT EXISTS idx_training_data_dates ON model_training_data(observation_date, target_date);

-- RLS Policies
ALTER TABLE model_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_training_data ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read predictions
CREATE POLICY "Authenticated users can view predictions"
  ON model_predictions FOR SELECT
  TO authenticated
  USING (true);

-- Anyone authenticated can read model configs
CREATE POLICY "Authenticated users can view model configs"
  ON model_configs FOR SELECT
  TO authenticated
  USING (true);

-- Service role can manage all tables (for Inngest worker)
-- (Assuming you're using service_role key in worker)
