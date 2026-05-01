/**
 * Common types for news integrations
 */

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO 8601
  summary?: string;
  content?: string;
  relevanceScore?: number; // 0-1
  sentiment?: "positive" | "negative" | "neutral";
}

export interface NewsSearchOptions {
  query: string;
  limit?: number;
  fromDate?: Date;
  toDate?: Date;
}

export interface NewsProvider {
  name: string;
  search(options: NewsSearchOptions): Promise<NewsArticle[]>;
  isConfigured(): boolean;
}

export interface NewsSearchResult {
  articles: NewsArticle[];
  provider: string;
  cached: boolean;
  error?: string;
}
