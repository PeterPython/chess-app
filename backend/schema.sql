create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists opening_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  opening_id text not null,
  side text not null check (side in ('w', 'b')),
  strength int not null check (strength between 1 and 5),
  lessons int not null default 0,
  opening_attempts int not null default 0,
  opening_correct int not null default 0,
  off_book_events int not null default 0,
  completions int not null default 0,
  games_finished int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, opening_id, side, strength)
);

create table if not exists repetition_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  opening_id text not null,
  side text not null check (side in ('w', 'b')),
  due_at timestamptz not null default now(),
  interval_days int not null default 0,
  ease numeric not null default 2.5,
  streak int not null default 0,
  reviews int not null default 0,
  last_outcome text,
  unique (user_id, opening_id, side)
);
