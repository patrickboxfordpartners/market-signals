create table if not exists user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker_id uuid not null references tickers(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, ticker_id)
);

create index if not exists user_watchlist_user_id_idx on user_watchlist(user_id);
create index if not exists user_watchlist_ticker_id_idx on user_watchlist(ticker_id);

alter table user_watchlist enable row level security;

create policy "Users can manage their own watchlist"
  on user_watchlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
