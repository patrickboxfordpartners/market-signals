import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

interface LLMProviderConfig {
  name: "xai" | "openai" | "anthropic" | "google"
  model: string
  apiKey: string | null
  enabled: boolean
}

function getProviderConfigs(): LLMProviderConfig[] {
  return [
    {
      name: "xai",
      model: "grok-3-mini",
      apiKey: Deno.env.get('XAI_API_KEY') || null,
      enabled: !!Deno.env.get('XAI_API_KEY'),
    },
    {
      name: "openai",
      model: "gpt-4o-mini",
      apiKey: Deno.env.get('OPENAI_API_KEY') || null,
      enabled: !!Deno.env.get('OPENAI_API_KEY'),
    },
    {
      name: "anthropic",
      model: "claude-haiku-4-5-20251001",
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') || null,
      enabled: !!Deno.env.get('ANTHROPIC_API_KEY'),
    },
    {
      name: "google",
      model: "gemini-1.5-pro",
      apiKey: Deno.env.get('GOOGLE_AI_API_KEY') || null,
      enabled: !!Deno.env.get('GOOGLE_AI_API_KEY'),
    },
  ]
}

async function callXAI(
  config: LLMProviderConfig,
  request: LLMRequest
): Promise<LLMResponse> {
  const startTime = Date.now()

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`XAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const latencyMs = Date.now() - startTime

  return {
    content: data.choices[0].message.content,
    model: config.model,
    provider: "xai",
    tokensUsed: data.usage?.total_tokens,
    latencyMs,
  }
}

async function callOpenAI(
  config: LLMProviderConfig,
  request: LLMRequest
): Promise<LLMResponse> {
  const startTime = Date.now()

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const latencyMs = Date.now() - startTime

  return {
    content: data.choices[0].message.content,
    model: config.model,
    provider: "openai",
    tokensUsed: data.usage?.total_tokens,
    latencyMs,
  }
}

async function callAnthropic(
  config: LLMProviderConfig,
  request: LLMRequest
): Promise<LLMResponse> {
  const startTime = Date.now()

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      system: request.systemPrompt,
      messages: [{ role: "user", content: request.userPrompt }],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const latencyMs = Date.now() - startTime

  return {
    content: data.content[0].text,
    model: config.model,
    provider: "anthropic",
    tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
    latencyMs,
  }
}

async function callGemini(
  config: LLMProviderConfig,
  request: LLMRequest
): Promise<LLMResponse> {
  const startTime = Date.now()

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${request.systemPrompt}\n\n${request.userPrompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 2000,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const latencyMs = Date.now() - startTime

  return {
    content: data.candidates[0].content.parts[0].text,
    model: config.model,
    provider: "google",
    tokensUsed: data.usageMetadata?.totalTokenCount,
    latencyMs,
  }
}

async function routeLLMRequest(request: LLMRequest): Promise<LLMResponse> {
  const providers = getProviderConfigs().filter((p) => p.enabled)

  if (providers.length === 0) {
    throw new Error(
      "No LLM providers configured. Please add API keys to Supabase secrets."
    )
  }

  const errors: Array<{ provider: string; error: string }> = []

  for (const provider of providers) {
    try {
      console.log(`[LLM Proxy] Trying provider: ${provider.name}`)

      let response: LLMResponse

      switch (provider.name) {
        case "xai":
          response = await callXAI(provider, request)
          break
        case "openai":
          response = await callOpenAI(provider, request)
          break
        case "anthropic":
          response = await callAnthropic(provider, request)
          break
        case "google":
          response = await callGemini(provider, request)
          break
        default:
          throw new Error(`Unknown provider: ${provider.name}`)
      }

      console.log(
        `[LLM Proxy] Success with ${provider.name} (${response.latencyMs}ms)`
      )

      return response
    } catch (error: any) {
      const errorMsg = error.message || "Unknown error"
      errors.push({ provider: provider.name, error: errorMsg })
      console.warn(
        `[LLM Proxy] Provider ${provider.name} failed: ${errorMsg}`
      )
      continue
    }
  }

  throw new Error(
    `All LLM providers failed:\n${errors.map((e) => `- ${e.provider}: ${e.error}`).join("\n")}`
  )
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request
    const llmRequest: LLMRequest = await req.json()

    // Validate input
    if (!llmRequest.systemPrompt || !llmRequest.userPrompt) {
      throw new Error('Missing systemPrompt or userPrompt')
    }

    // Route request through LLM fallback chain
    const response = await routeLLMRequest(llmRequest)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('[LLM Proxy] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
