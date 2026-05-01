/**
 * Quick test script for LLM client
 * Usage: npx tsx src/integrations/llm/test-llm.ts
 */

import "dotenv/config";
import { llmClient } from "./client.js";

async function testLLMClient() {
  console.log("🧪 Testing LLM Client\n");

  const providers = llmClient.getConfiguredProviders();
  console.log(`✓ Configured providers: ${providers.join(", ")}\n`);

  if (providers.length === 0) {
    console.log("⚠️  No LLM providers configured. Add API keys to .env:");
    console.log("  - XAI_API_KEY (Grok)");
    console.log("  - OPENAI_API_KEY (GPT-4)");
    console.log("  - ANTHROPIC_API_KEY (Claude)");
    console.log("  - GOOGLE_API_KEY (Gemini)\n");
    process.exit(1);
  }

  try {
    console.log("Analyzing NVDA sentiment...\n");

    const result = await llmClient.chat({
      messages: [
        {
          role: "system",
          content: "You are a financial analyst. Analyze stock sentiment briefly.",
        },
        {
          role: "user",
          content:
            "NVIDIA (NVDA) just reported record earnings with strong AI chip demand. Analysts raised price targets. What's the sentiment? Answer in 50 words.",
        },
      ],
      temperature: 0.7,
      maxTokens: 200,
    });

    console.log(`✓ Provider used: ${result.provider} (${result.model})`);
    console.log(`✓ Cached: ${result.cached}`);
    console.log(`\nResponse:\n${result.content}\n`);

    console.log("✅ Test passed!");
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testLLMClient();
