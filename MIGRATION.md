# Database Migration: Alert System

## Run the Alert Tables Migration

The alert system requires two new tables: `alert_preferences` and `alert_log`.

### Steps:

1. Open your Supabase dashboard: https://supabase.com/dashboard/project/ezunrnagkdafwuesumqy
2. Go to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase_alerts.sql` and paste into the editor
5. Click **Run** or press `Cmd+Enter`

### What This Creates:

- **alert_preferences** table
  - User alert settings (spike alerts, prediction alerts, daily digest)
  - Thresholds and delivery channels (email, webhook)
  - RLS policies for user privacy

- **alert_log** table  
  - History of all alerts sent
  - Delivery status tracking
  - RLS policies for user privacy

### Verification:

After running, verify the tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('alert_preferences', 'alert_log');
```

You should see both tables listed.
