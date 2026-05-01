/**
 * SerpAPI news integration
 * https://serpapi.com/news-results
 */

import type { NewsProvider, NewsArticle, NewsSearchOptions } from "./types.js";

export class SerpAPINewsProvider implements NewsProvider {
  name = "serpapi";
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPAPI_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(options: NewsSearchOptions): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      throw new Error("SerpAPI API key not configured");
    }

    const params = new URLSearchParams({
      engine: "google_news",
      q: options.query,
      api_key: this.apiKey,
      gl: "us",
      hl: "en",
    });

    if (options.limit) {
      params.set("num", Math.min(options.limit, 100).toString());
    }

    // SerpAPI uses "tbs" for time-based search (qdr:d = past day, qdr:w = past week)
    if (options.fromDate) {
      const daysAgo = Math.floor((Date.now() - options.fromDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo <= 1) params.set("tbs", "qdr:d");
      else if (daysAgo <= 7) params.set("tbs", "qdr:w");
      else if (daysAgo <= 30) params.set("tbs", "qdr:m");
    }

    const url = `https://serpapi.com/search?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }

    const articles: NewsArticle[] = [];

    // Process news_results
    if (data.news_results) {
      for (const item of data.news_results) {
        articles.push({
          title: item.title,
          url: item.link,
          source: item.source?.name || "Unknown",
          publishedAt: item.date ? this.parseDate(item.date) : new Date().toISOString(),
          summary: item.snippet,
        });
      }
    }

    return articles.slice(0, options.limit || 50);
  }

  private parseDate(dateStr: string): string {
    // SerpAPI returns dates like "2 hours ago", "1 day ago", etc.
    // Convert to ISO 8601

    const now = new Date();

    const hoursMatch = dateStr.match(/(\d+)\s*hours?\s*ago/i);
    if (hoursMatch) {
      now.setHours(now.getHours() - parseInt(hoursMatch[1]));
      return now.toISOString();
    }

    const daysMatch = dateStr.match(/(\d+)\s*days?\s*ago/i);
    if (daysMatch) {
      now.setDate(now.getDate() - parseInt(daysMatch[1]));
      return now.toISOString();
    }

    // Fallback: try to parse as ISO or return current time
    try {
      return new Date(dateStr).toISOString();
    } catch {
      return now.toISOString();
    }
  }
}
