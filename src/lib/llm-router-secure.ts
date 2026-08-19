/**
 * Secure Multi-LLM Router (Client-Side)
 * Proxies all LLM requests through Supabase Edge Function
 * API keys are never exposed to the client
 */

import { supabase } from '../integrations/supabase/client'

interface LLMRequest {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}

interface LLMResponse {
  content: string
  model: string
  provider: "xai" | "openai" | "anthropic" | "google"
  tokensUsed?: number
  latencyMs: number
}

/**
 * Route LLM request through secure server-side proxy
 * All API keys are stored as Supabase secrets and never exposed to client
 */
export async function routeLLMRequest(
  request: LLMRequest
): Promise<LLMResponse> {
  try {
    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('You must be logged in to use LLM features')
    }

    // Call Supabase Edge Function with authentication
    const { data, error } = await supabase.functions.invoke('llm-proxy', {
      body: request,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) {
      throw new Error(`LLM Proxy error: ${error.message}`)
    }

    if (!data || !data.content) {
      throw new Error('Invalid response from LLM proxy')
    }

    return data as LLMResponse
  } catch (error: any) {
    console.error('[LLM Router] Error:', error)
    throw error
  }
}

/**
 * Get list of available providers (client-side placeholder)
 * Actual provider availability is determined server-side
 */
export function getAvailableProviders(): Array<{
  name: string
  model: string
  enabled: boolean
}> {
  // Return placeholder data since actual availability is server-side
  return [
    { name: "xai", model: "grok-3-mini", enabled: true },
    { name: "openai", model: "gpt-4o-mini", enabled: true },
    { name: "anthropic", model: "claude-haiku-4-5-20251001", enabled: true },
    { name: "google", model: "gemini-1.5-pro", enabled: true },
  ]
}
