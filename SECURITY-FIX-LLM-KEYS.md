# Security Fix: LLM API Key Exposure

**Date:** August 17, 2026  
**Severity:** CRITICAL  
**Status:** ✅ Code Fixed - Deployment Required

---

## Issue

LLM API keys (XAI, OpenAI, Anthropic, Google Gemini, FRED) were exposed client-side via `VITE_` environment variables. Anyone inspecting the browser could extract these keys and consume API quota.

**CVSS Score:** 9.8 (Critical)

---

## Fix Applied

### 1. Created Secure Server-Side Proxy

**File:** `/supabase/functions/llm-proxy/index.ts`

- All LLM API calls now route through Supabase Edge Function
- API keys stored as Supabase secrets (server-side only)
- Requires authentication via Supabase auth token
- Maintains fallback chain: XAI → OpenAI → Anthropic → Google

### 2. Updated Client Library

**File:** `/src/lib/llm-router-secure.ts`

- New secure wrapper for client-side LLM requests
- Proxies through Supabase Edge Function
- Never exposes API keys to client

### 3. Updated Import References

**File:** `/src/lib/ai-agents.ts`

- Changed import from `llm-router` to `llm-router-secure`

---

## Deployment Steps

### Step 1: Set Supabase Secrets

Run these commands to store API keys as secrets (never exposed to client):

```bash
# XAI / Grok API Key
npx supabase secrets set XAI_API_KEY="your-xai-api-key-here"

# OpenAI API Key  
npx supabase secrets set OPENAI_API_KEY="your-openai-api-key-here"

# Anthropic API Key
npx supabase secrets set ANTHROPIC_API_KEY="your-anthropic-api-key-here"

# Google AI API Key
npx supabase secrets set GOOGLE_AI_API_KEY="your-google-ai-api-key-here"

# FRED Economic Data API Key (if used)
npx supabase secrets set FRED_API_KEY="your-fred-api-key-here"
```

### Step 2: Deploy Edge Function

```bash
npx supabase functions deploy llm-proxy
```

### Step 3: Update Environment Variables

**Remove from `.env` (or `.env.local`):**

```bash
# DELETE THESE - They expose keys to client:
# VITE_XAI_API_KEY=xxx
# VITE_OPENAI_API_KEY=xxx
# VITE_ANTHROPIC_API_KEY=xxx
# VITE_GOOGLE_AI_API_KEY=xxx
# VITE_FRED_API_KEY=xxx
```

**Keep these (non-sensitive):**

```bash
# These are safe to keep:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Rotate All Exposed API Keys

**CRITICAL:** Since keys were exposed client-side, rotate them immediately:

1. **XAI / Grok:**  
   https://console.x.ai/ → API Keys → Revoke old → Create new

2. **OpenAI:**  
   https://platform.openai.com/api-keys → Revoke old → Create new

3. **Anthropic:**  
   https://console.anthropic.com/settings/keys → Revoke old → Create new

4. **Google AI:**  
   https://makersuite.google.com/app/apikey → Delete old → Create new

5. **Update Supabase secrets** with new keys (Step 1 above)

### Step 5: Deploy Frontend

```bash
npm run build
# Deploy to Vercel/your hosting provider
```

---

## Testing

### Test Edge Function Locally

```bash
# Start Supabase locally
npx supabase start

# Set local secrets
npx supabase secrets set --env-file .env.local

# Deploy function locally
npx supabase functions serve llm-proxy

# Test with curl
curl -X POST http://localhost:54321/functions/v1/llm-proxy \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a helpful assistant.",
    "userPrompt": "Say hello",
    "temperature": 0.7,
    "maxTokens": 100
  }'
```

### Verify Keys Not Exposed

1. Build production bundle: `npm run build`
2. Inspect `dist/` directory
3. Search for API keys: `grep -r "sk-" dist/` (should return nothing)
4. Check browser DevTools Network tab - no API keys in requests

---

## Files Changed

- ✅ `/supabase/functions/llm-proxy/index.ts` (NEW)
- ✅ `/src/lib/llm-router-secure.ts` (NEW)  
- ✅ `/src/lib/ai-agents.ts` (UPDATED - import changed)
- ⚠️ `/src/lib/llm-router.ts` (OLD - can be deleted after verification)
- ⚠️ `/src/lib/economic-data.ts` (NEEDS UPDATE - still uses VITE_FRED_API_KEY)

---

## Remaining Work

### 1. Fix FRED API Key Exposure

**File:** `/src/lib/economic-data.ts`

Currently still exposes FRED API key:
```typescript
const FRED_API_KEY = import.meta.env.VITE_FRED_API_KEY;
```

**Fix:** Create `/supabase/functions/fred-proxy/index.ts` or add FRED to llm-proxy

### 2. Verify No Other Client-Side Keys

Search for any remaining exposed keys:

```bash
grep -r "import\.meta\.env\.VITE_.*KEY\|process\.env\.REACT_APP_.*KEY" src/
```

---

## Verification Checklist

- [ ] Supabase secrets set for all LLM providers
- [ ] Edge function deployed to production
- [ ] Old API keys rotated
- [ ] `.env` files cleaned (no VITE_*_API_KEY variables)
- [ ] Frontend redeployed
- [ ] Browser inspection confirms no API keys visible
- [ ] LLM features tested and working
- [ ] FRED API key issue addressed
- [ ] Old `llm-router.ts` file deleted

---

## Cost Impact

**Before Fix:**
- Unlimited API abuse possible
- $10,000-$50,000/month risk

**After Fix:**
- Only authenticated users can access LLM features
- Usage tracked per user
- Can add rate limiting per user if needed

---

## Related Files

- Security Audit Report: `/SECURITY-AUDIT-REPORT.md`
- TrueVoice Reference Fix: `/true-voice-insights/supabase/functions/deepgram-token/`

---

## Questions?

Contact: patrick@boxfordpartners.com
