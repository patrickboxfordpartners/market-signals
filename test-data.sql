-- Quick test data to populate the dashboard
-- Run this in Supabase SQL Editor

-- Insert tickers first
INSERT INTO tickers (symbol, company_name, sector, industry, mention_spike_threshold, is_active)
VALUES
  ('NVDA', 'NVIDIA Corporation', 'Technology', 'Semiconductors', 20, true),
  ('TSLA', 'Tesla Inc', 'Consumer Cyclical', 'Auto Manufacturers', 30, true),
  ('AAPL', 'Apple Inc', 'Technology', 'Consumer Electronics', 25, true),
  ('META', 'Meta Platforms Inc', 'Technology', 'Social Media', 25, true),
  ('GOOGL', 'Alphabet Inc', 'Technology', 'Internet', 20, true)
ON CONFLICT (symbol) DO NOTHING;

-- Insert test sources
INSERT INTO sources (name, platform, username, credibility_score, accuracy_rate, total_predictions, correct_predictions)
VALUES
  ('WallStreetBets Sentiment', 'reddit', 'r/wallstreetbets', 65.5, 58.2, 245, 143),
  ('TechCrunch', 'twitter', '@TechCrunch', 78.3, 72.1, 189, 136),
  ('Cathie Wood ARK', 'twitter', '@CathieDWood', 71.2, 66.8, 98, 65),
  ('Reuters Markets', 'twitter', '@ReutersMarkets', 82.1, 79.4, 156, 124)
ON CONFLICT (platform, username) DO NOTHING;

-- Get IDs for foreign key references
DO $$
DECLARE
  nvda_id uuid;
  tsla_id uuid;
  aapl_id uuid;
  meta_id uuid;
  wsb_id uuid;
  tech_id uuid;
  ark_id uuid;
BEGIN
  SELECT id INTO nvda_id FROM tickers WHERE symbol = 'NVDA' LIMIT 1;
  SELECT id INTO tsla_id FROM tickers WHERE symbol = 'TSLA' LIMIT 1;
  SELECT id INTO aapl_id FROM tickers WHERE symbol = 'AAPL' LIMIT 1;
  SELECT id INTO meta_id FROM tickers WHERE symbol = 'META' LIMIT 1;
  SELECT id INTO wsb_id FROM sources WHERE username = 'r/wallstreetbets' LIMIT 1;
  SELECT id INTO tech_id FROM sources WHERE username = '@TechCrunch' LIMIT 1;
  SELECT id INTO ark_id FROM sources WHERE username = '@CathieDWood' LIMIT 1;

  -- Insert test mentions from last 72 hours
  INSERT INTO mentions (ticker_id, source_id, platform, content, mentioned_at, sentiment_score, processed)
  VALUES
    -- NVDA mentions (HOT stock)
    (nvda_id, wsb_id, 'reddit', 'NVDA to the moon 🚀 Jensen cooking with that new AI chip reveal', NOW() - INTERVAL '2 hours', 0.85, true),
    (nvda_id, tech_id, 'twitter', 'NVIDIA announces breakthrough in AI processing - stock up 4% pre-market', NOW() - INTERVAL '8 hours', 0.75, true),
    (nvda_id, ark_id, 'twitter', 'Adding to NVDA position. Data center demand is insane right now', NOW() - INTERVAL '1 day', 0.80, true),
    (nvda_id, wsb_id, 'reddit', 'Anyone else loading NVDA calls before earnings? Seems like free money', NOW() - INTERVAL '18 hours', 0.70, true),

    -- TSLA mentions (volatile)
    (tsla_id, wsb_id, 'reddit', 'Elon just tweeted about FSD beta - TSLA $300 EOW', NOW() - INTERVAL '4 hours', 0.60, true),
    (tsla_id, tech_id, 'twitter', 'Tesla deliveries beat expectations for Q4', NOW() - INTERVAL '1 day', 0.65, true),
    (tsla_id, wsb_id, 'reddit', 'TSLA gang rise up 💎🙌', NOW() - INTERVAL '12 hours', 0.55, true),

    -- AAPL mentions (steady)
    (aapl_id, tech_id, 'twitter', 'Apple Vision Pro pre-orders exceed expectations', NOW() - INTERVAL '2 days', 0.70, true),
    (aapl_id, ark_id, 'twitter', 'AAPL looking oversold here, considering entry', NOW() - INTERVAL '1 day', 0.50, true),

    -- META mentions (mixed)
    (meta_id, wsb_id, 'reddit', 'META AI announcements were underwhelming tbh', NOW() - INTERVAL '6 hours', 0.35, true),
    (meta_id, tech_id, 'twitter', 'Meta Reality Labs losses continue to mount', NOW() - INTERVAL '1 day', 0.30, true);

  -- Insert test predictions
  INSERT INTO predictions (ticker_id, source_id, prediction_date, sentiment, price_target, timeframe_days, confidence_level, reasoning_quality_score, data_discipline_score, reasoning_summary)
  VALUES
    (nvda_id, ark_id, NOW() - INTERVAL '1 day', 'bullish', 580.00, 30, 'high', 82, 76, 'Strong data center demand, AI chip leadership, expanding margins'),
    (tsla_id, wsb_id, 'reddit', NOW() - INTERVAL '12 hours', 'bullish', 300.00, 7, 'medium', 45, 38, 'FSD beta hype, delivery beat, Elon tweet momentum'),
    (aapl_id, tech_id, NOW() - INTERVAL '2 days', 'neutral', 190.00, 90, 'medium', 68, 71, 'Vision Pro demand strong but iPhone sales slowing in China');

END $$;
