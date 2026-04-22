create table if not exists content_drafts (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'market-signals',
  type text not null default 'linkedin',
  title text not null,
  body text not null,
  metadata jsonb default '{}',
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists content_drafts_created_at_idx on content_drafts(created_at desc);
create index if not exists content_drafts_type_idx on content_drafts(type);
