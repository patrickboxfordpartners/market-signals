# Market Signals - System Overview

Stock sentiment tracking with credibility-weighted source analysis.

## The Problem

Most stock sentiment tools suffer from:
1. **No source accountability** - all opinions weighted equally
2. **No historical validation** - predictions disappear into the void
3. **Manual analysis required** - human has to decide what's valuable
4. **Noise overwhelming signal** - WSB pump-and-dump drowns out real analysis

## The Solution

Market Signals automatically:
1. **Tracks who said what** - every prediction attributed to a source
2. **Validates outcomes** - compares predictions to actual price movements
3. **Builds credibility scores** - sources earn reputation through accuracy
4. **Weights signals** - high-credibility sources get more weight
5. **Evaluates reasoning** - uses equity analyst frameworks to score analysis quality

## How It Works

### 1. Detection Phase (Every 15 minutes)

```
Scanner → Platforms (Twitter, Reddit) → Extract tickers → Store mentions
```

**What it does:**
- Searches for stock tickers ($NVDA, TSLA, etc.)
- Captures content, source, timestamp, engagement
- Creates source profiles (name, platform, followers)
- Stores raw mentions for processing

**Example mention captured:**
```
"$NVDA looks strong heading into earnings. 
PT $150 by Q2. Jensen's AI roadmap is 🔥"
- @TechAnalyst123, Twitter, 1.2K likes
```

### 2. Spike Detection Phase (Every hour)

```
Aggregator → Count mentions per ticker → Compare to avg → Flag spikes
```

**What it does:**
- Aggregates today's mentions for each ticker
- Compares to 30-day rolling average
- Flags tickers when `mentions > avg + threshold`
- Triggers extraction for spiking tickers

**Example spike:**
```
NVDA: 47 mentions today vs 12 avg → SPIKE DETECTED
Triggers: Extract predictions from NVDA mentions
```

### 3. Extraction Phase (Every hour + spike-triggered)

```
Unprocessed mentions → Grok AI → Extract structured prediction → Score reasoning
```

**What it does:**
- Takes unprocessed mentions (50 per batch)
- Uses XAI Grok to extract:
  - Sentiment (bullish/bearish/neutral)
  - Price target ($150)
  - Timeframe (by Q2 = 90 days)
  - Catalysts (earnings, AI roadmap)
  - Data sources cited
- **Scores reasoning quality** using equity analyst frameworks:
  - **Lynch Pitch** - Do they explain the bull case with real data?
  - **Munger Invert** - Do they consider what could go wrong?
  - **Data Discipline** - Do they cite sources or just say "I think"?
  - **Transparency** - Do they admit uncertainty?

**Example extraction:**
```json
{
  "is_prediction": true,
  "sentiment": "bullish",
  "price_target": 150,
  "timeframe_days": 90,
  "confidence_level": "high",
  "reasoning": "AI roadmap indicates strong product pipeline",
  "catalysts": ["earnings", "AI announcements"],
  "data_sources_cited": [],
  "reasoning_quality_score": 0.6,  // No SEC filings cited
  "data_discipline_score": 0.3,     // Just says "looks strong"
  "transparency_score": 0.8         // No hedging, overconfident
}
```

### 4. Validation Phase (Daily at 9 PM ET)

```
Predictions past target_date → Fetch prices → Compare → Update credibility
```

**What it does:**
- Finds predictions past their target date
- Fetches historical price at prediction date
- Fetches current price
- Calculates: Was the prediction correct?
- Scores accuracy (0-100)
- **Automatically updates source credibility** via database trigger

**Example validation:**
```
Prediction: NVDA bullish, $150 by Q2
- Price at prediction: $120
- Price at validation: $145
- Change: +20.8%
- Outcome: CORRECT (bullish + price increased)
- Accuracy score: 83/100 (close to target)
- Source credibility: 68 → 71 (+3)
```

## Credibility Scoring Formula

**Source credibility = weighted combination:**
- **70% prediction accuracy** - percentage of correct predictions
- **20% prediction volume** - number of predictions (capped at 50)
- **10% reasoning quality** - average reasoning score from extractions

**Why this matters:**
- A source with 90% accuracy on 10 predictions → credibility 73
- A source with 60% accuracy on 100 predictions → credibility 62
- A source with 80% accuracy + strong reasoning → credibility 79

**Result:** High-accuracy sources with good reasoning get the most weight.

## Reasoning Quality Evaluation

Based on your uploaded equity analyst prompts:

### The Lynch Pitch (Bull Case)
- ✅ Clear investment thesis
- ✅ Cites real data (10-K, 10-Q, earnings calls)
- ✅ Explains business model and moat
- ✅ Identifies specific catalysts
- ✅ Considers market position

**Score 0-1:** How well do they make the bull case?

### The Munger Invert (Bear Case)
- ✅ Considers structural weaknesses
- ✅ Examines balance sheet risks
- ✅ Identifies competitive threats
- ✅ Questions management credibility
- ✅ Admits uncertainty

**Score 0-1:** Do they think about what could go wrong?

### Management Analysis
- ✅ Reviews guidance vs reality
- ✅ Examines financial trends (beat/miss/quantify)
- ✅ Evaluates capital allocation
- ✅ Considers insider behavior

**Score 0-1:** Do they analyze management track record?

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL SOURCES                         │
│  Twitter API  │  Reddit API  │  News APIs  │  Alpha Vantage │
└───────┬──────────────┬───────────────┬──────────────┬────────┘
        │              │               │              │
        v              v               v              v
┌─────────────────────────────────────────────────────────────┐
│                    INNGEST WORKERS                           │
│  Scan (15m) │ Detect Spikes (1h) │ Extract (1h) │ Validate │
└───────┬──────────────┬───────────────┬──────────────┬────────┘
        │              │               │              │
        v              v               v              v
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE DATABASE                          │
│    mentions  │  predictions  │  validations  │  sources     │
└───────┬──────────────┬───────────────┬──────────────┬────────┘
        │              │               │              │
        └──────────────┴───────────────┴──────────────┘
                       │
                       v
┌─────────────────────────────────────────────────────────────┐
│                      DASHBOARD UI                            │
│  Source Leaderboard  │  Signals  │  Predictions  │  Tickers │
└─────────────────────────────────────────────────────────────┘
```

## Key Differentiators

### vs FinTwit Sentiment Tools
- ❌ **They:** All tweets weighted equally
- ✅ **Us:** Sources earn credibility through track record

### vs Stock Prediction Platforms
- ❌ **They:** No accountability (predictions vanish)
- ✅ **Us:** Every prediction validated, sources scored

### vs Analyst Ratings
- ❌ **They:** Manual analysis, slow updates
- ✅ **Us:** Automated, real-time, continuous validation

### vs Reddit/WSB
- ❌ **They:** Noise overwhelming signal
- ✅ **Us:** Credibility-weighted aggregation

## Use Cases

### 1. Signal Identification
**Problem:** Which of 50 NVDA mentions today is worth investigating?

**Solution:** Sort by source credibility score
```
📊 High-credibility sources (80+) bullish on NVDA: 3
📊 Medium-credibility sources (60-79) bullish: 12
📊 Low-credibility sources (< 60) bullish: 35

→ Signal strength: MODERATE-STRONG
```

### 2. Source Discovery
**Problem:** Who are the most accurate analysts for semiconductor stocks?

**Solution:** Query sources table
```sql
SELECT name, platform, credibility_score, accuracy_rate
FROM sources
WHERE total_predictions > 10
AND /* has made predictions on semiconductor tickers */
ORDER BY credibility_score DESC;
```

### 3. Trend Detection
**Problem:** Is NVDA buzz increasing or just normal?

**Solution:** Check mention frequency
```
NVDA mentions:
- Today: 47
- 7-day avg: 23
- 30-day avg: 12
→ Spike detected, investigate catalysts
```

### 4. Risk Management
**Problem:** Too much hype, is this a pump-and-dump?

**Solution:** Check source quality distribution
```
📊 High-credibility sources: 10% bearish, 5% bullish
📊 Low-credibility sources: 90% bullish

→ RED FLAG: Low-quality sources dominating sentiment
```

## Future Enhancements

**Phase 2 (Months 1-3):**
- Dashboard UI (source leaderboard, signals, predictions)
- Seeking Alpha integration
- News API (Benzinga, MarketWatch)
- Email alerts for high-credibility signals

**Phase 3 (Months 3-6):**
- Portfolio integration (only show signals for your holdings)
- AI-generated summaries ("Why NVDA is spiking today")
- Historical backtesting (what if you followed high-credibility sources?)
- Source rankings by sector

**Phase 4 (Months 6-12):**
- Options flow integration
- Institutional holdings tracking
- Earnings surprise correlation
- Hedge fund 13F filings

## Technical Architecture

**Frontend:** Vite + React + TypeScript + Tailwind
**Backend:** Supabase (PostgreSQL + Edge Functions)
**Workers:** Inngest + Node.js (Express)
**AI:** XAI Grok (reasoning evaluation)
**Data:** Twitter/Reddit APIs, Alpha Vantage

**Why this stack:**
- Supabase: Real-time subscriptions for live updates
- Inngest: Built-in retries, cron, and monitoring
- XAI Grok: Best reasoning analysis (vs GPT/Claude)
- PostgreSQL: Complex aggregations and triggers

## Repository Structure

```
market-signals/
├── src/
│   ├── inngest/
│   │   ├── client.ts                 # Inngest config
│   │   └── functions/
│   │       ├── scan-mentions.ts      # Scanner (15m)
│   │       ├── detect-spikes.ts      # Spike detector (1h)
│   │       ├── extract-predictions.ts # Extraction (1h)
│   │       └── validate-predictions.ts # Validator (daily)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts             # Supabase client
│   │       └── types.ts              # Database types
│   ├── components/                   # React components (TBD)
│   ├── pages/                        # Dashboard pages (TBD)
│   └── hooks/                        # React hooks (TBD)
├── worker.ts                         # Inngest server
├── supabase-schema.sql               # Database schema
├── QUICK-START.md                    # 10-minute setup guide
├── WORKER.md                         # Worker documentation
└── README.md                         # Project overview
```

## Getting Started

See [QUICK-START.md](./QUICK-START.md) for setup instructions.

## Documentation

- [QUICK-START.md](./QUICK-START.md) - Get running in 10 minutes
- [WORKER.md](./WORKER.md) - Worker architecture and deployment
- [README.md](./README.md) - Project overview

## Current Status

✅ Database schema complete
✅ Worker functions implemented
✅ Automatic scanning (Twitter, Reddit)
✅ Spike detection
✅ Prediction extraction with reasoning evaluation
✅ Historical validation
✅ Automatic credibility scoring
⬜ Dashboard UI (next task)

## License

Private - Boxford Partners
