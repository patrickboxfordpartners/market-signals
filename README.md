# Market Signals

Stock sentiment tracking with credibility-weighted source analysis. Automatically detects ticker mention spikes, captures predictions with reasoning, validates outcomes, and builds source credibility scores over time.

## Architecture

**Flow:**
1. **Scanner** detects frequency spikes for tickers across platforms (Twitter, Reddit, news)
2. **Capture** extracts sentiment, price targets, timeframes, and reasoning
3. **Attribution** identifies and profiles the source
4. **Evaluation** scores reasoning quality using equity analyst frameworks (Lynch, Munger)
5. **Validation** compares predictions to actual outcomes over time
6. **Credibility** updates source scores based on track record
7. **Signals** provides credibility-weighted sentiment aggregation

## Database Schema

### Core Tables
- **tickers** - Stock symbols being tracked
- **sources** - Analysts, influencers, publications making predictions
- **mentions** - Raw detected mentions of tickers
- **predictions** - Structured predictions with reasoning
- **validations** - Outcomes validating prediction accuracy
- **mention_frequency** - Daily aggregated mention counts for spike detection

### Key Features
- Automatic credibility scoring (70% accuracy + 20% volume + 10% reasoning quality)
- Source track record tracking
- Reasoning quality evaluation based on equity analyst frameworks
- Spike detection for ticker mentions

## Tech Stack

- **Frontend:** Vite + React 18 + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **AI Analysis:** XAI Grok (source reasoning evaluation)
- **Data Sources:** Twitter/X API, Reddit API, Alpha Vantage

## Setup

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Fill in your API keys
   ```

3. **Set up Supabase:**
   - Create a new Supabase project
   - Run the schema: `supabase-schema.sql`
   - Copy URL and anon key to `.env`

4. **Run development server:**
   ```bash
   npm run dev
   ```

## Evaluation Prompts

The system uses three equity analyst frameworks to evaluate source reasoning quality:

### 1. The Lynch Pitch (Bull Case)
Evaluates if the source:
- States a clear investment thesis
- Cites real data and documents
- Explains the business model and competitive advantages
- Identifies specific catalysts
- Considers market position and risks

### 2. The Munger Invert (Bear Case)
Evaluates if the source:
- Considers structural weaknesses
- Identifies balance sheet risks
- Examines competitive threats
- Addresses management credibility
- Acknowledges what could go wrong

### 3. Management Analysis
Evaluates if the source:
- Reviews actual management guidance vs reality
- Examines financial statement trends
- Identifies strategy execution and capital allocation
- Considers insider behavior

## Key Concepts

**Credibility Score (0-100):**
- 70% prediction accuracy
- 20% prediction volume (capped at 50)
- 10% reasoning quality

**Reasoning Quality (0-1):**
- Data discipline (do they cite sources?)
- Transparency (do they admit uncertainty?)
- Framework usage (do they use sound reasoning?)

**Source Types:**
- Individual (retail traders, individuals)
- Publication (Seeking Alpha, Benzinga, MarketWatch)
- Analyst Firm (Goldman Sachs, Morgan Stanley)
- Influencer (high-follower accounts)

## Repurposing trend-weaver

The scanner component is adapted from `trend-weaver`, pivoting from "content generation" to "mention detection + sentiment aggregation":

**trend-weaver → market-signals:**
- Tweet tracking → Mention tracking
- Engagement metrics → Credibility metrics
- Topics → Tickers
- Content generation → Source evaluation

## Project Status

- [x] Database schema designed
- [ ] Scanner built (adapt from trend-weaver)
- [ ] Sentiment capture pipeline
- [ ] Source evaluation with equity analyst prompts
- [ ] Historical validation system
- [ ] Dashboard UI

## License

Private - Boxford Partners
