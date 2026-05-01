/**
 * Multi-source news aggregator with automatic fallback
 * Priority: SerpAPI → Tavily → NewsAPI → SearXNG (quota-free fallback)
 */

import type { NewsProvider, NewsArticle, NewsSearchOptions, NewsSearchResult } from "./types.js";
import { SerpAPINewsProvider } from "./serpapi.js";
import { TavilyNewsProvider } from "./tavily.js";
import { SearXNGNewsProvider } from "./searxng.js";

// Legacy NewsAPI provider (already used in scan-mentions.ts)
class NewsAPIProvider implements NewsProvider {
  name = "newsapi";
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEWS_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(options: NewsSearchOptions): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      throw new Error("NewsAPI key not configured");
    }

    const params = new URLSearchParams({
      q: options.query,
      language: "en",
      sortBy: "publishedAt",
      pageSize: Math.min(options.limit || 20, 100).toString(),
      apiKey: this.apiKey,
    });

    if (options.fromDate) {
      params.set("from", options.fromDate.toISOString().split("T")[0]);
    }
    if (options.toDate) {
      params.set("to", options.toDate.toISOString().split("T")[0]);
    }

    const url = `https://newsapi.org/v2/everything?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === "error") {
      throw new Error(`NewsAPI error: ${data.message}`);
    }

    const articles: NewsArticle[] = [];

    if (data.articles) {
      for (const item of data.articles) {
        articles.push({
          title: item.title,
          url: item.url,
          source: item.source.name,
          publishedAt: item.publishedAt,
          summary: item.description,
          content: item.content,
        });
      }
    }

    return articles;
  }
}

export class NewsAggregator {
  private providers: NewsProvider[];
  private cache = new Map<string, { articles: NewsArticle[]; timestamp: number }>();
  private cacheTTL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    // Priority order: paid/high-quality first, free fallback last
    this.providers = [
      new SerpAPINewsProvider(),
      new TavilyNewsProvider(),
      new NewsAPIProvider(),
      new SearXNGNewsProvider(), // Always available, no API key needed
    ];
  }

  /**
   * Search news across all configured providers with automatic fallback
   */
  async search(options: NewsSearchOptions): Promise<NewsSearchResult> {
    const cacheKey = this.getCacheKey(options);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return {
        articles: cached.articles,
        provider: "cache",
        cached: true,
      };
    }

    // Try each provider in priority order
    const errors: string[] = [];

    for (const provider of this.providers) {
      if (!provider.isConfigured()) {
        continue; // Skip unconfigured providers
      }

      try {
        console.log(`[NewsAggregator] Trying ${provider.name}...`);
        const articles = await provider.search(options);

        if (articles.length > 0) {
          // Cache successful results
          this.cache.set(cacheKey, { articles, timestamp: Date.now() });

          console.log(`[NewsAggregator] ✓ ${provider.name} returned ${articles.length} articles`);

          return {
            articles,
            provider: provider.name,
            cached: false,
          };
        }

        console.log(`[NewsAggregator] ✗ ${provider.name} returned 0 articles`);
      } catch (error: any) {
        const msg = error.message || String(error);
        errors.push(`${provider.name}: ${msg}`);
        console.error(`[NewsAggregator] ${provider.name} failed:`, msg);
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error(
      `All news providers failed:\n${errors.join("\n")}`
    );
  }

  /**
   * Get news from multiple providers and merge results (for higher coverage)
   */
  async searchMultiple(options: NewsSearchOptions): Promise<NewsArticle[]> {
    const results = await Promise.allSettled(
      this.providers
        .filter((p) => p.isConfigured())
        .map((p) => p.search(options))
    );

    const allArticles: NewsArticle[] = [];
    const seenUrls = new Set<string>();

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const article of result.value) {
          // Deduplicate by URL
          if (!seenUrls.has(article.url)) {
            seenUrls.add(article.url);
            allArticles.push(article);
          }
        }
      }
    }

    // Sort by published date (newest first)
    allArticles.sort((a, b) => {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return allArticles.slice(0, options.limit || 50);
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): string[] {
    return this.providers.filter((p) => p.isConfigured()).map((p) => p.name);
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  private getCacheKey(options: NewsSearchOptions): string {
    return JSON.stringify({
      query: options.query,
      limit: options.limit,
      from: options.fromDate?.toISOString(),
      to: options.toDate?.toISOString(),
    });
  }
}

// Singleton instance
export const newsAggregator = new NewsAggregator();
