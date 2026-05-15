-- NestAI initial schema
-- Run via: supabase db push

create extension if not exists "uuid-ossp";

create table if not exists user_credits (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  balance    int  not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_credits (user_id, balance) values (new.id, 3);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create or replace function deduct_credits(p_user_id uuid, p_amount int)
returns void language plpgsql security definer as $$
begin
  update user_credits
    set balance = balance - p_amount, updated_at = now()
    where user_id = p_user_id and balance >= p_amount;
  if not found then
    raise exception 'Insufficient credits';
  end if;
end;
$$;

create or replace function add_credits(p_user_id uuid, p_amount int)
returns void language plpgsql security definer as $$
begin
  insert into user_credits (user_id, balance)
    values (p_user_id, p_amount)
    on conflict (user_id) do update
      set balance = user_credits.balance + p_amount, updated_at = now();
end;
$$;

create table if not exists design_sessions (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  image_url      text not null,
  user_prompt    text not null,
  analysis       jsonb not null,
  recommendation jsonb not null,
  credits_used   int  not null default 1,
  created_at     timestamptz not null default now()
);

alter table user_credits    enable row level security;
alter table design_sessions enable row level security;

create policy "users_own_credits"  on user_credits    for all using (auth.uid() = user_id);
create policy "users_own_sessions" on design_sessions for all using (auth.uid() = user_id);
