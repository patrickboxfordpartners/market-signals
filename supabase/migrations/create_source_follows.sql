create table if not exists source_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, source_id)
);

create index if not exists source_follows_user_id_idx on source_follows(user_id);
create index if not exists source_follows_source_id_idx on source_follows(source_id);

alter table source_follows enable row level security;

create policy "Users can manage their own source follows"
  on source_follows for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
