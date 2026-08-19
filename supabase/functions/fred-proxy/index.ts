import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FRED_API_KEY = Deno.env.get('FRED_API_KEY')
const FRED_BASE_URL = "https://api.stlouisfed.org/fred"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!FRED_API_KEY) {
      throw new Error('FRED_API_KEY not configured')
    }

    // Parse query parameters
    const url = new URL(req.url)
    const seriesId = url.searchParams.get('series_id')
    const endpoint = url.searchParams.get('endpoint') || 'series/observations'

    if (!seriesId) {
      throw new Error('Missing series_id parameter')
    }

    // Build FRED API URL
    const fredUrl = `${FRED_BASE_URL}/${endpoint}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`

    // Fetch from FRED
    const response = await fetch(fredUrl)

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`)
    }

    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('[FRED Proxy] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
