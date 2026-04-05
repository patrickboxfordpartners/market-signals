# Quick Start Guide

Get Market Signals running in 10 minutes.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- API keys (see below)

## Step 1: Clone & Install

```bash
cd /Users/patrickmitchell/market-signals
npm install
```

## Step 2: Set Up Supabase

1. Go to https://supabase.com/dashboard
2. Create a new project (takes ~2 minutes)
3. Once ready, go to **SQL Editor**
4. Copy the contents of `supabase-schema.sql`
5. Paste and run it
6. Go to **Settings** → **API** → copy your URL and anon key

## Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# REQUIRED - Get from Supabase Settings → API
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# REQUIRED - Get from https://console.x.ai
VITE_XAI_API_KEY=xai-xxxxx

# OPTIONAL (but recommended)
VITE_TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAxxxx
VITE_REDDIT_CLIENT_ID=xxxxx
VITE_REDDIT_CLIENT_SECRET=xxxxx
VITE_ALPHA_VANTAGE_API_KEY=xxxxx
```

### Getting API Keys

**XAI Grok** (required for prediction analysis):
- https://console.x.ai
- Sign up → API Keys → Create new key
- $5/month for 1M tokens

**Twitter** (optional):
- https://developer.twitter.com
- Create app → Keys and tokens → Bearer Token
- Free tier: 450 requests/15min

**Reddit** (optional):
- https://www.reddit.com/prefs/apps
- Create app → type: "script" → copy client ID & secret
- Free tier: 60 requests/min

**Alpha Vantage** (optional):
- https://www.alphavantage.co/support/#api-key
- Free API key
- 5 requests/min, 500/day

## Step 4: Add Tickers

Open Supabase **SQL Editor** and run:

```sql
INSERT INTO tickers (symbol, company_name, mention_spike_threshold, is_active)
VALUES
  ('NVDA', 'NVIDIA Corporation', 20, true),
  ('TSLA', 'Tesla Inc', 30, true),
  ('AAPL', 'Apple Inc', 25, true),
  ('MSFT', 'Microsoft Corporation', 25, true),
  ('GOOGL', 'Alphabet Inc', 20, true),
  ('AMZN', 'Amazon.com Inc', 20, true),
  ('META', 'Meta Platforms Inc', 25, true),
  ('AMD', 'Advanced Micro Devices', 15, true),
  ('COIN', 'Coinbase Global Inc', 15, true),
  ('PLTR', 'Palantir Technologies', 15, true);
```

Adjust `mention_spike_threshold` based on how popular the stock is (higher = harder to trigger spike).

## Step 5: Run the Worker

### Development Mode (with Inngest Dev Server)

```bash
npm run worker:dev
```

Open http://localhost:8288 to see the Inngest dashboard.

**Manually trigger a scan:**
1. Go to Functions → "scan-mentions"
2. Click "Invoke"
3. Watch the logs

### Production Mode

```bash
npm run worker
```

## Step 6: Monitor Progress

### Check for mentions

```sql
SELECT
  t.symbol,
  s.name as source,
  m.content,
  m.mentioned_at
FROM mentions m
JOIN tickers t ON t.id = m.ticker_id
LEFT JOIN sources s ON s.id = m.source_id
ORDER BY m.mentioned_at DESC
LIMIT 20;
```

### Check for spikes

```sql
SELECT
  t.symbol,
  mf.date,
  mf.mention_count,
  t.avg_daily_mentions,
  mf.spike_detected
FROM mention_frequency mf
JOIN tickers t ON t.id = mf.ticker_id
ORDER BY mf.date DESC
LIMIT 20;
```

### Check predictions

```sql
SELECT
  t.symbol,
  s.name as source,
  p.sentiment,
  p.price_target,
  p.confidence_level,
  p.reasoning_quality_score,
  p.data_discipline_score,
  p.prediction_date
FROM predictions p
JOIN tickers t ON t.id = p.ticker_id
JOIN sources s ON s.id = p.source_id
ORDER BY p.prediction_date DESC
LIMIT 20;
```

### Check source credibility

```sql
SELECT
  name,
  platform,
  credibility_score,
  accuracy_rate,
  total_predictions,
  correct_predictions,
  reasoning_quality
FROM sources
WHERE total_predictions > 0
ORDER BY credibility_score DESC
LIMIT 10;
```

## Expected Timeline

**First 15 minutes:**
- Scan runs → mentions start appearing

**First hour:**
- Spike detection runs → aggregates mention frequency
- Extraction runs → analyzes unprocessed mentions
- Predictions start appearing (if mentions contain price targets/sentiment)

**First 24 hours:**
- Rolling averages stabilize
- More sources profiled
- Spike detection becomes more accurate

**First week:**
- First validations (if predictions have short timeframes)
- Source credibility scores start updating
- Historical patterns emerge

## Troubleshooting

**No mentions showing up:**
- Verify API keys are correct
- Check worker logs for errors
- Try manually triggering "scan-mentions" in Inngest dashboard

**Predictions not extracting:**
- Check XAI API key is valid
- Look for `processed = false` mentions in database
- Check worker logs for Grok API errors

**Worker crashes:**
- Check all required env vars are set (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_XAI_API_KEY)
- Ensure Supabase database is accessible
- Check if ports 3001 and 8288 are available

## Next Steps

Once data starts flowing:

1. **Build the dashboard** (Task #3) - visualize source leaderboard, signals, validation results
2. **Add more tickers** - expand coverage
3. **Tune spike thresholds** - adjust based on actual mention volumes
4. **Add more platforms** - Seeking Alpha, Benzinga, news APIs
5. **Deploy to production** - Railway, Render, or Vercel

## Cost Estimate (Month 1)

- Supabase: **Free** (< 500MB DB)
- XAI Grok: **$5** (1M tokens)
- Twitter/Reddit/Alpha Vantage: **Free** (within rate limits)
- Inngest: **Free** (< 100K runs)
- Hosting (Railway/Render): **$5-10**

**Total: ~$10-15/month**
