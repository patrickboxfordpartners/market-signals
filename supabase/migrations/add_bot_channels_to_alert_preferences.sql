alter table alert_preferences
  add column if not exists telegram_enabled boolean default false,
  add column if not exists telegram_chat_id text,
  add column if not exists discord_enabled boolean default false,
  add column if not exists discord_webhook_url text;
