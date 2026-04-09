-- Alert preferences and delivery settings

-- Alert preferences table
CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Alert types
  spike_alerts_enabled BOOLEAN DEFAULT true,
  prediction_alerts_enabled BOOLEAN DEFAULT true,
  daily_digest_enabled BOOLEAN DEFAULT false,

  -- Thresholds
  spike_mention_threshold INT DEFAULT 20,
  prediction_confidence_threshold INT DEFAULT 70,

  -- Delivery channels
  email_enabled BOOLEAN DEFAULT true,
  email_address TEXT,
  webhook_enabled BOOLEAN DEFAULT false,
  webhook_url TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- Alert delivery log
CREATE TABLE IF NOT EXISTS alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'spike', 'prediction', 'digest'
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Alert content
  ticker_symbol TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,

  -- Delivery status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  delivery_channel TEXT, -- 'email', 'webhook'
  error_message TEXT,

  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_preferences_user ON alert_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_log_user ON alert_log(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_log_type ON alert_log(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_log_status ON alert_log(status);
CREATE INDEX IF NOT EXISTS idx_alert_log_created ON alert_log(created_at DESC);

-- RLS Policies
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_log ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own alert preferences
CREATE POLICY "Users can view own alert preferences"
  ON alert_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alert preferences"
  ON alert_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert preferences"
  ON alert_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own alert logs
CREATE POLICY "Users can view own alert logs"
  ON alert_log FOR SELECT
  USING (auth.uid() = user_id);

-- Insert default preferences for existing users (optional migration)
-- INSERT INTO alert_preferences (user_id, email_address)
-- SELECT id, email FROM auth.users
-- ON CONFLICT (user_id) DO NOTHING;
