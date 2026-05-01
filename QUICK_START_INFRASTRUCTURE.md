# Street Insights - Infrastructure Quick Start

**Status:** ✅ ALL 4 MODULES READY TO USE

---

## 🗞️ Multi-Source News

**Configured providers:** SerpAPI ✓ | Tavily ✓ | NewsAPI ✓ | SearXNG ✓

```bash
# Test it
npx tsx src/integrations/news/test-news.ts

# Use in code
import { newsAggregator } from "./integrations/news";
const result = await newsAggregator.search({ query: "NVDA", limit: 10 });
```

**Fallback order:** SerpAPI → Tavily → NewsAPI → SearXNG (free)

---

## 🤖 Multi-Model LLM

**Configured providers:** Grok ✓ | GPT-4 ⏭️ | Claude ⏭️ | Gemini ⏭️

```bash
# Test it
npx tsx src/integrations/llm/test-llm.ts

# Use in code
import { llmClient } from "./integrations/llm";
const result = await llmClient.chat({ messages: [...] });
```

**Fallback order:** Grok → GPT-4 → Claude → Gemini

**To add more providers:** Add keys to `.env`:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

---

## 📱 Multi-Channel Notifications

**Configured channels:** Email ✓ | Telegram ⏭️ | Discord ⏭️ | Slack ⏭️

```bash
# Test it
npx tsx src/services/test-notifications.ts

# Use in code
import { notificationService } from "./services/notifications";
await notificationService.send({ message: "Alert!" }, ["email", "telegram"]);
```

**To add Telegram:**
1. Create bot: @BotFather on Telegram
2. Get token: `123456:ABC-DEF...`
3. Get chat ID: Send message, visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Add to `.env`:
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=-1001234567890
```

**To add Discord:**
1. Create bot: https://discord.com/developers/applications
2. Enable "Message Content Intent"
3. Invite to server: OAuth2 → bot → Send Messages
4. Get channel ID: Right-click channel → Copy ID
5. Add to `.env`:
```
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MA...
DISCORD_CHANNEL_ID=1234567890123456789
```

---

## 📊 Technical Indicators

**Indicators:** MA5/10/20/50/200, EMA12/26, MACD, RSI14, Volume

```bash
# Test it
npx tsx src/lib/test-technical.ts

# Use in code
import { calculateTechnicalIndicators, analyzeTrend, calculateChartScore } from "./lib/technical-indicators";

const indicators = calculateTechnicalIndicators(ohlcvBars);
const trend = analyzeTrend(indicators);
const chartScore = calculateChartScore(indicators, trend);

console.log(`Chart Score: ${chartScore.score}/100`);
```

**Chart Score breakdown:**
- Trend: 0-40 points (MA alignment, strength)
- Momentum: 0-30 points (MACD, RSI)
- Volume: 0-20 points (vs 20-day avg)
- Support: 0-10 points (price vs MAs)

---

## 🚀 Quick Deploy to Production

### 1. Update Railway Environment Variables

```bash
# Multi-source news
SERPAPI_API_KEY=56f7283f17ed8b8331337fef98ac597b5961d7495f69fdaa7b7a2cdf148f7a9a
TAVILY_API_KEY=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
SEARXNG_BASE_URL=https://searx.be
```

### 2. Deploy Updated Code

```bash
cd ~/market-signals
git add .
git commit -m "feat: add multi-source news, LLM failover, multi-channel alerts, technical indicators"
git push origin main
```

Railway will auto-deploy.

### 3. Replace scan-mentions Function

In `src/inngest/functions/index.ts`:
```typescript
// OLD
export { scanMentions } from "./scan-mentions.js";

// NEW
export { scanMentionsV2 as scanMentions } from "./scan-mentions-v2.js";
```

### 4. Monitor Logs

```bash
# Railway dashboard → market-signals-worker → Logs
# Look for:
[NewsAggregator] ✓ serpapi returned 10 articles
[LLMClient] ✓ xai succeeded
```

---

## 📈 Next: Add Chart Score to Dashboard

### Database Migration

```sql
ALTER TABLE predictions
ADD COLUMN chart_score INTEGER,
ADD COLUMN trend_strength TEXT,
ADD COLUMN ma_alignment TEXT,
ADD COLUMN rsi_14 DECIMAL(5,2),
ADD COLUMN technical_analyzed_at TIMESTAMPTZ;
```

### Create Inngest Function

See `INFRASTRUCTURE_UPGRADE_2026-05-01.md` → "Database Schema Changes (TODO)"

### Update UI

Add Chart Score badge to prediction cards:
```tsx
{prediction.chart_score && (
  <Badge variant={prediction.chart_score >= 70 ? "success" : "default"}>
    Chart: {prediction.chart_score}/100
  </Badge>
)}
```

---

## 🧪 Testing Checklist

- [x] News aggregator works with all 4 providers
- [x] LLM client successfully calls Grok
- [x] Notification service configured for email
- [x] Technical indicators calculate correctly
- [ ] Deployed to Railway staging
- [ ] Monitored logs for 24 hours
- [ ] Tested in production with real alerts

---

## 📞 Support

**Documentation:**
- Full guide: `INFRASTRUCTURE_UPGRADE_2026-05-01.md`
- Analysis: `~/daily_stock_analysis_integration_analysis.md`

**Issues?**
- Check Railway logs first
- Verify API keys in Railway env vars
- Test locally with `npx tsx src/integrations/<module>/test-*.ts`

---

*Last updated: 2026-05-01*
