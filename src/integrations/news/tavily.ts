/**
 * Tavily AI Search integration
 * https://tavily.com/
 */

import type { NewsProvider, NewsArticle, NewsSearchOptions } from "./types.js";

export class TavilyNewsProvider implements NewsProvider {
  name = "tavily";
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async search(options: NewsSearchOptions): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      throw new Error("Tavily API key not configured");
    }

    const body = {
      api_key: this.apiKey,
      query: options.query,
      search_depth: "advanced",
      include_answer: false,
      include_images: false,
      include_raw_content: false,
      max_results: options.limit || 10,
      // Tavily supports date filtering in topic mode
      topic: "news",
    };

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Tavily error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Tavily error: ${data.error}`);
    }

    const articles: NewsArticle[] = [];

    if (data.results) {
      for (const item of data.results) {
        articles.push({
          title: item.title,
          url: item.url,
          source: this.extractDomain(item.url),
          publishedAt: item.published_date || new Date().toISOString(),
          summary: item.content,
          relevanceScore: item.score, // Tavily provides 0-1 relevance score
        });
      }
    }

    return articles;
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
