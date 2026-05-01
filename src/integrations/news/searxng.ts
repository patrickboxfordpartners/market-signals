/**
 * SearXNG news integration (self-hosted or public instance)
 * https://docs.searxng.org/dev/search_api.html
 */

import type { NewsProvider, NewsArticle, NewsSearchOptions } from "./types.js";

export class SearXNGNewsProvider implements NewsProvider {
  name = "searxng";
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.SEARXNG_BASE_URL || "https://searx.be";
  }

  isConfigured(): boolean {
    // SearXNG is always available (public instances or self-hosted)
    return true;
  }

  async search(options: NewsSearchOptions): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      q: options.query,
      format: "json",
      categories: "news",
      language: "en-US",
      time_range: this.getTimeRange(options.fromDate),
    });

    if (options.limit) {
      params.set("pageno", "1");
    }

    const url = `${this.baseUrl}/search?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "market-signals/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`SearXNG error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const articles: NewsArticle[] = [];

    if (data.results) {
      for (const item of data.results) {
        articles.push({
          title: item.title,
          url: item.url,
          source: this.extractDomain(item.url),
          publishedAt: item.publishedDate
            ? new Date(item.publishedDate).toISOString()
            : new Date().toISOString(),
          summary: item.content,
        });
      }
    }

    return articles.slice(0, options.limit || 50);
  }

  private getTimeRange(fromDate?: Date): string {
    if (!fromDate) return "";

    const daysAgo = Math.floor((Date.now() - fromDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysAgo <= 1) return "day";
    if (daysAgo <= 7) return "week";
    if (daysAgo <= 30) return "month";
    if (daysAgo <= 365) return "year";

    return "";
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, "");
    } catch {
      return "Unknown";
    }
  }
}
