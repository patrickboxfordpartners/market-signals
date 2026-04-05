# Market Signals Worker

Background job processor for automated stock sentiment tracking.

## Architecture

The worker runs four automated jobs:

### 1. Scan Mentions (Every 15 minutes)
- Scans Twitter and Reddit for ticker mentions
- Extracts tickers from posts
- Creates or updates source profiles
- Stores raw mentions in database
- **Rate limits:** Twitter 450/15min, Reddit 60/min

### 2. Detect Spikes (Every hour)
- Aggregates daily mention counts per ticker
- Compares to 30-day rolling average
- Flags spikes when `mentions > avg + threshold`
- Triggers prediction extraction for spiking tickers
- Updates `mention_frequency` table

### 3. Extract Predictions (Every hour + triggered by spikes)
- Processes unprocessed mentions (50 per batch)
- Uses XAI Grok to extract:
  - Sentiment (bullish/bearish/neutral)
  - Price targets and timeframes
  - Reasoning and catalysts
  - Data sources cited
- **Scores reasoning quality** using Lynch/Munger frameworks:
  - Reasoning quality (0-1): Clear thesis, real data, catalysts
  - Data discipline (0-1): Cites sources, uses numbers
  - Transparency (0-1): Admits uncertainty, acknowledges risks
- Creates structured predictions
- Updates source quality metrics

### 4. Validate Predictions (Daily at 9 PM ET)
- Finds predictions past their target date
- Fetches historical and current prices
- Calculates accuracy score
- Marks predictions as correct/incorrect
- **Automatic credibility updates** via database trigger
- **Rate limits:** Alpha Vantage 5/min (free tier)

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Required variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `VITE_XAI_API_KEY` - XAI Grok API key
- `VITE_TWITTER_BEARER_TOKEN` - Twitter API bearer token
- `VITE_REDDIT_CLIENT_ID` - Reddit app client ID
- `VITE_REDDIT_CLIENT_SECRET` - Reddit app secret
- `VITE_ALPHA_VANTAGE_API_KEY` - Alpha Vantage API key

### 3. Set Up Supabase Database
```bash
# Run the schema
psql <your_connection_string> < supabase-schema.sql
```

### 4. Add Tickers to Track
```sql
INSERT INTO tickers (symbol, company_name, mention_spike_threshold, is_active)
VALUES
  ('NVDA', 'NVIDIA Corporation', 20, true),
  ('TSLA', 'Tesla Inc', 30, true),
  ('AAPL', 'Apple Inc', 25, true),
  ('MSFT', 'Microsoft Corporation', 25, true),
  ('GOOGL', 'Alphabet Inc', 20, true);
```

### 5. Run Worker (Development)
```bash
# With Inngest Dev Server (recommended for testing)
npm run worker:dev
```

Open Inngest Dev Server: http://localhost:8288

### 6. Run Worker (Production)
```bash
npm run worker
```

## Deployment

### Option A: Railway
```bash
# Install Railway CLI
npm install -g railway

# Login
railway login

# Deploy
railway init
railway up
```

Set environment variables in Railway dashboard.

### Option B: Render
1. Create new "Background Worker" service
2. Build command: `npm install`
3. Start command: `npm run worker`
4. Add environment variables

### Option C: Vercel (with Inngest)
The worker can run on Vercel using Inngest Cloud:
1. Deploy to Vercel: `vercel deploy`
2. Configure Inngest Cloud to point to your Vercel URL
3. Cron jobs run via Inngest's infrastructure

## Monitoring

### Inngest Dev Server (Development)
- http://localhost:8288
- See all function runs, logs, and failures
- Manually trigger functions
- Inspect event history

### Inngest Cloud (Production)
- https://app.inngest.com
- Production monitoring dashboard
- Alerts and retries
- Function execution history

### Database Queries

**Check recent mentions:**
```sql
SELECT
  m.content,
  t.symbol,
  s.name as source,
  m.mentioned_at
FROM mentions m
JOIN tickers t ON t.id = m.ticker_id
JOIN sources s ON s.id = m.source_id
ORDER BY m.mentioned_at DESC
LIMIT 10;
```

**Check spike detection:**
```sql
SELECT
  t.symbol,
  mf.date,
  mf.mention_count,
  t.avg_daily_mentions,
  mf.spike_detected
FROM mention_frequency mf
JOIN tickers t ON t.id = mf.ticker_id
WHERE mf.spike_detected = true
ORDER BY mf.date DESC;
```

**Check predictions:**
```sql
SELECT
  t.symbol,
  s.name as source,
  p.sentiment,
  p.price_target,
  p.reasoning_quality_score,
  p.prediction_date
FROM predictions p
JOIN tickers t ON t.id = p.ticker_id
JOIN sources s ON s.id = p.source_id
ORDER BY p.prediction_date DESC
LIMIT 10;
```

**Check source credibility:**
```sql
SELECT
  name,
  platform,
  credibility_score,
  accuracy_rate,
  total_predictions,
  correct_predictions
FROM sources
WHERE total_predictions > 0
ORDER BY credibility_score DESC
LIMIT 20;
```

## Rate Limits

| Service | Limit | Worker Behavior |
|---------|-------|-----------------|
| Twitter API | 450 req/15min | 250ms delay between requests |
| Reddit API | 60 req/min | 1s delay between requests |
| XAI Grok | ~60 req/min | 1s delay between requests |
| Alpha Vantage (free) | 5 req/min | 12s delay between requests |

For higher throughput, upgrade to paid API tiers.

## Troubleshooting

**Worker won't start:**
- Check all environment variables are set
- Ensure Supabase is accessible
- Verify API keys are valid

**No mentions detected:**
- Check API credentials
- Verify tickers are marked `is_active = true`
- Check Twitter/Reddit API rate limits

**Predictions not extracting:**
- Check XAI API key and quota
- Look for errors in worker logs
- Verify `processed = false` mentions exist

**Validations not running:**
- Check Alpha Vantage API key
- Ensure predictions have `target_date` set
- Verify `target_date < now()`

## Development Tips

**Test individual functions:**
```bash
npm run worker:dev
```

Open Inngest Dev Server → manually trigger a function

**Skip cron, trigger immediately:**
```typescript
// In your code
await inngest.send({
  name: "scan/mentions",
  data: {}
});
```

**Adjust batch sizes:**
Edit the `limit(50)` in each function to process more/fewer items per run.

**Change cron schedules:**
Edit the `cron` field in each function definition.

## Cost Estimates (Free Tiers)

- Twitter API: Free (450 req/15min)
- Reddit API: Free (60 req/min)
- XAI Grok: $5/month (1M tokens)
- Alpha Vantage: Free (5 req/min, 500 req/day)
- Supabase: Free (500MB DB, 2GB bandwidth)
- Inngest: Free (100K function runs/month)

**Scaling:** For 100 tickers tracked 24/7:
- ~9,600 scans/day (every 15 min)
- ~2,400 extractions/day (hourly)
- ~100 validations/day (daily)
- **Total:** ~12,100 function runs/day = ~363K/month (within free tier)

**Paid tier needed when:**
- Tracking 200+ tickers
- Scanning every 5 minutes
- Processing 1000+ mentions/hour
