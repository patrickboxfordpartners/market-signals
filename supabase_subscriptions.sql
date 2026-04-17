-- Street Insights Subscription Schema
-- Add subscription/billing fields for Stripe integration

-- User profiles with subscription info
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,

  -- Subscription
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing')),

  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Limits based on plan
  api_calls_this_month INTEGER DEFAULT 0,
  api_calls_limit INTEGER DEFAULT 100, -- free tier

  -- Timestamps
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription ON user_profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan ON user_profiles(plan);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update timestamp trigger
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not subscription fields)
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Plan limits lookup
CREATE OR REPLACE FUNCTION get_plan_limits(plan_name TEXT)
RETURNS TABLE(api_calls_limit INTEGER, alerts_limit INTEGER, tickers_limit INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE plan_name
      WHEN 'free' THEN 100
      WHEN 'pro' THEN 10000
      WHEN 'enterprise' THEN 100000
      ELSE 100
    END AS api_calls_limit,
    CASE plan_name
      WHEN 'free' THEN 5
      WHEN 'pro' THEN 50
      WHEN 'enterprise' THEN 500
      ELSE 5
    END AS alerts_limit,
    CASE plan_name
      WHEN 'free' THEN 10
      WHEN 'pro' THEN 100
      WHEN 'enterprise' THEN 1000
      ELSE 10
    END AS tickers_limit;
END;
$$ LANGUAGE plpgsql;
