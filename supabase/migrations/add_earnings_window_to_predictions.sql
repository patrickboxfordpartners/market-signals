alter table predictions
  add column if not exists earnings_window boolean default false,
  add column if not exists earnings_date date;
