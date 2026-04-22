create table if not exists options_flow (
  id uuid primary key default gen_random_uuid(),
  ticker_id uuid references tickers(id) on delete cascade,
  symbol text not null,
  contract_type text not null check (contract_type in ('call', 'put')),
  strike_price numeric,
  expiration_date date,
  open_interest int,
  volume int,
  implied_volatility numeric,
  premium numeric,
  sentiment text check (sentiment in ('bullish', 'bearish', 'neutral')),
  unusual_score numeric,
  source text default 'unusualwhales',
  detected_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists options_flow_ticker_id_idx on options_flow(ticker_id);
create index if not exists options_flow_detected_at_idx on options_flow(detected_at desc);
create index if not exists options_flow_symbol_idx on options_flow(symbol);
