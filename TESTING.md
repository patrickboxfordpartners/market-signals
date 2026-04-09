# Testing Guide: Alert System

## Prerequisites

### 1. Run Database Migration

Run `supabase_alerts.sql` in your Supabase SQL editor:
- Creates `alert_preferences` and `alert_log` tables
- Sets up RLS policies

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('alert_preferences', 'alert_log');
```

### 2. Configure Resend (Optional)

For actual email delivery:
1. Sign up at https://resend.com (free tier: 100 emails/day)
2. Get API key from dashboard
3. Add to `.env`:
   ```
   RESEND_API_KEY=re_...
   FROM_EMAIL=alerts@yourdomain.com
   ```

Without Resend, alerts will still log to database but won't send emails.

### 3. Start Worker

```bash
npm run worker
```

Worker should show all registered functions including:
- send-spike-alerts
- send-prediction-alerts  
- send-daily-digest

## Testing Alert Preferences UI

1. Navigate to `/alerts` in the dashboard
2. Configure settings:
   - Enable/disable alert types
   - Set thresholds (spike mentions, prediction confidence)
   - Add email address
   - Optionally add webhook URL

3. Click "Save Preferences"
4. Verify in Supabase `alert_preferences` table

## Testing Spike Detection Alerts

**Trigger:** Spike detection function finds mentions above threshold

### Manual Trigger via Inngest Dev Server:

1. Start Inngest Dev Server:
   ```bash
   npx inngest-cli@latest dev
   ```

2. Open http://localhost:8288

3. Trigger `detect-spikes` function manually

4. If spikes detected, should trigger `send-spike-alerts`

### Verify:

```sql
-- Check alert_log for spike alerts
SELECT * FROM alert_log 
WHERE alert_type = 'spike' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Testing Prediction Alerts

**Trigger:** AI extracts high-confidence predictions

### Manual Trigger:

1. In Inngest Dev Server, trigger `extract-predictions`
2. If high-confidence predictions found, triggers `send-prediction-alerts`

### Verify:

```sql
-- Check for high-confidence predictions
SELECT * FROM predictions 
WHERE confidence_level = 'high' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check alert_log for prediction alerts
SELECT * FROM alert_log 
WHERE alert_type = 'prediction' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Testing Daily Digest

**Trigger:** Cron schedule (9 AM daily) or manual trigger

### Manual Trigger:

1. In Inngest Dev Server, trigger `send-daily-digest`
2. Should compile yesterday's activity and send digest

### Verify:

```sql
-- Check alert_log for digest
SELECT * FROM alert_log 
WHERE alert_type = 'digest' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Testing Email Delivery

### With Resend Configured:

1. Set up alert preferences with your email
2. Trigger any alert function
3. Check your inbox for email
4. Verify `alert_log` shows `status = 'sent'`

### Without Resend:

- Worker logs will show: "Resend not configured. Email would have been sent: [subject]"
- `alert_log` will show `status = 'failed'` with error message
- This is expected behavior

## Testing Webhook Delivery

1. Use a webhook testing service (e.g., webhook.site)
2. Add webhook URL to alert preferences
3. Disable email, enable webhook
4. Trigger any alert function
5. Check webhook.site for POST request
6. Verify `alert_log` shows `status = 'sent'`

## Testing Alert History UI

1. Navigate to `/alerts/history`
2. Should see past alerts from `alert_log`
3. Test filters (all, spike, prediction, digest)
4. Click alert row to see full details
5. Verify status badges (Sent, Pending, Failed)

## End-to-End Test Flow

**Complete flow from spike detection to email delivery:**

1. Ensure alert preferences configured with email
2. Create test ticker with low threshold (e.g., 5 mentions)
3. Manually insert mentions into `mentions` table above threshold:
   ```sql
   INSERT INTO mentions (ticker_id, source_id, content, platform, mentioned_at)
   VALUES 
     ('your_ticker_id', 'your_source_id', 'Test mention 1', 'reddit', now()),
     ('your_ticker_id', 'your_source_id', 'Test mention 2', 'reddit', now()),
     -- ... repeat to exceed threshold
   ```

4. Trigger `detect-spikes` function
5. Should detect spike and trigger `send-spike-alerts`
6. Check email inbox
7. Verify in Alert History UI
8. Check `alert_log` table

## Troubleshooting

### No Alerts Received

- Check alert preferences: are alerts enabled?
- Check thresholds: are they too high?
- Check email address: is it correct?
- Check worker logs for errors
- Verify Resend API key is valid

### Alerts Log But Don't Send

- Check Resend API key in `.env`
- Verify FROM_EMAIL domain is verified in Resend
- Check worker logs for "Resend not configured" message

### Database Errors

- Verify migration ran successfully
- Check RLS policies allow inserts
- Ensure user_id matches authenticated user

## Production Checklist

Before going live:

- [ ] Run database migration in production Supabase
- [ ] Add Resend API key to production environment
- [ ] Verify FROM_EMAIL domain
- [ ] Test with real email addresses
- [ ] Set appropriate thresholds (avoid spam)
- [ ] Monitor alert_log for delivery failures
- [ ] Set up alerts for alert delivery failures (meta!)
