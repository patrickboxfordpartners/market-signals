/**
 * Multi-model LLM client with automatic failover
 * Uses LiteLLM for unified API across providers
 * Fallback chain: Grok → GPT-4 → Claude → Gemini
 */

import Anthropic from "@anthropic-ai/sdk";

// LLM provider configuration
interface LLMProvider {
  name: string;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

const providers: LLMProvider[] = [
  {
    name: "xai",
    model: "grok-3-latest",
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
  },
  {
    name: "openai",
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
  },
  {
    name: "anthropic",
    model: "claude-3-5-haiku-20241022",
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  {
    name: "google",
    model: "gemini-2.0-flash-exp",
    apiKey: process.env.GOOGLE_API_KEY,
  },
];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

export interface ChatCompletionResult {
  content: string;
  provider: string;
  model: string;
  cached: boolean;
}

class LLMClient {
  private cache = new Map<string, { content: string; timestamp: number }>();
  private cacheTTL = 60 * 60 * 1000; // 1 hour

  /**
   * Generate chat completion with automatic fallback
   */
  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const cacheKey = this.getCacheKey(options);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return {
        content: cached.content,
        provider: "cache",
        model: "cache",
        cached: true,
      };
    }

    const errors: string[] = [];

    // Try each provider in order
    for (const provider of providers) {
      if (!provider.apiKey) {
        continue; // Skip unconfigured providers
      }

      try {
        console.log(`[LLMClient] Trying ${provider.name} (${provider.model})...`);

        let content: string;

        if (provider.name === "xai" || provider.name === "openai") {
          // OpenAI-compatible API
          const response = await fetch(`${provider.baseURL || "https://api.openai.com/v1"}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify({
              model: provider.model,
              messages: options.messages,
              temperature: options.temperature ?? 0.7,
              max_tokens: options.maxTokens ?? 2000,
              response_format: options.json ? { type: "json_object" } : undefined,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${provider.name} error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          content = data.choices[0].message.content;
        } else if (provider.name === "anthropic") {
          // Anthropic Claude API
          const anthropic = new Anthropic({ apiKey: provider.apiKey });

          // Extract system message
          const systemMessage = options.messages.find((m) => m.role === "system")?.content;
          const messages = options.messages.filter((m) => m.role !== "system");

          const response = await anthropic.messages.create({
            model: provider.model,
            max_tokens: options.maxTokens ?? 2000,
            system: systemMessage,
            messages: messages.map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
            temperature: options.temperature ?? 0.7,
          });

          content = response.content[0].type === "text" ? response.content[0].text : "";
        } else if (provider.name === "google") {
          // Google Gemini API
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: options.messages
                  .filter((m) => m.role !== "system")
                  .map((m) => ({
                    role: m.role === "assistant" ? "model" : "user",
                    parts: [{ text: m.content }],
                  })),
                generationConfig: {
                  temperature: options.temperature ?? 0.7,
                  maxOutputTokens: options.maxTokens ?? 2000,
                },
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          content = data.candidates[0].content.parts[0].text;
        } else {
          throw new Error(`Unknown provider: ${provider.name}`);
        }

        // Cache successful result
        this.cache.set(cacheKey, { content, timestamp: Date.now() });

        console.log(`[LLMClient] ✓ ${provider.name} succeeded`);

        return {
          content,
          provider: provider.name,
          model: provider.model,
          cached: false,
        };
      } catch (error: any) {
        const msg = error.message || String(error);
        errors.push(`${provider.name}: ${msg}`);
        console.error(`[LLMClient] ${provider.name} failed:`, msg);
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error(`All LLM providers failed:\n${errors.join("\n")}`);
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): string[] {
    return providers.filter((p) => !!p.apiKey).map((p) => `${p.name} (${p.model})`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  private getCacheKey(options: ChatCompletionOptions): string {
    return JSON.stringify({
      messages: options.messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      json: options.json,
    });
  }
}

// Singleton instance
export const llmClient = new LLMClient();
