/**
 * Quick test script for news aggregator
 * Usage: tsx src/integrations/news/test-news.ts
 */

import "dotenv/config";
import { newsAggregator } from "./aggregator.js";

async function testNewsAggregator() {
  console.log("🧪 Testing News Aggregator\n");

  const providers = newsAggregator.getConfiguredProviders();
  console.log(`✓ Configured providers: ${providers.join(", ")}\n`);

  if (providers.length === 0) {
    console.log("⚠️  No news providers configured. Add API keys to .env:");
    console.log("  - SERPAPI_API_KEY");
    console.log("  - TAVILY_API_KEY");
    console.log("  - NEWS_API_KEY");
    console.log("  - SEARXNG_BASE_URL (optional, defaults to https://searx.be)\n");
  }

  try {
    console.log("Searching for NVDA news...\n");

    const result = await newsAggregator.search({
      query: "NVDA stock earnings",
      limit: 5,
      fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    });

    console.log(`✓ Provider used: ${result.provider}`);
    console.log(`✓ Cached: ${result.cached}`);
    console.log(`✓ Articles found: ${result.articles.length}\n`);

    result.articles.forEach((article, i) => {
      console.log(`${i + 1}. ${article.title}`);
      console.log(`   Source: ${article.source}`);
      console.log(`   Published: ${new Date(article.publishedAt).toLocaleDateString()}`);
      console.log(`   URL: ${article.url}`);
      if (article.relevanceScore) {
        console.log(`   Relevance: ${(article.relevanceScore * 100).toFixed(0)}%`);
      }
      console.log();
    });

    console.log("✅ Test passed!");
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testNewsAggregator();
