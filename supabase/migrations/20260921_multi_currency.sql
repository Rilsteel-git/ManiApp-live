-- Multi-currency v1. Run once in Supabase SQL Editor after schema.sql.
-- Additive migration: existing entries remain IDR with rate 1.
begin;
alter table public.profiles
  add column if not exists report_currency text not null default 'IDR',
  add column if not exists report_rate numeric(20,8) not null default 1;
alter table public.wallets
  add column if not exists currency text not null default 'IDR',
  add column if not exists exchange_rate numeric(20,8) not null default 1;
alter table public.transactions
  add column if not exists currency text not null default 'IDR',
  add column if not exists exchange_rate numeric(20,8) not null default 1;

create or replace function public.validate_currency_record()
returns trigger language plpgsql set search_path = public as $$
declare
  code text;
  rate numeric;
  wallet_currency text;
begin
  if tg_table_name = 'profiles' then
    code := new.report_currency;
    rate := new.report_rate;
  else
    code := new.currency;
    rate := new.exchange_rate;
  end if;
  if code not in ('IDR','KRW','USD','EUR','JPY','SGD','MYR') then
    raise exception 'Unsupported currency';
  end if;
  if rate <= 0 or rate >= 1000000000 or rate::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Exchange rate must be positive and finite';
  end if;
  if code = 'IDR' and rate <> 1 then
    raise exception 'IDR rate must equal 1';
  end if;
  if tg_table_name = 'wallets' then
    if tg_op = 'UPDATE' then
      if new.currency is distinct from old.currency then
        raise exception 'Wallet currency is fixed; create another wallet';
      end if;
    end if;
    if abs(new.initial_balance) >= 1000000000000 or new.initial_balance::text in ('NaN','Infinity','-Infinity') then
      raise exception 'Invalid opening balance';
    end if;
    if code in ('IDR','KRW','JPY') and new.initial_balance <> trunc(new.initial_balance) then
      raise exception 'This currency requires whole amounts';
    end if;
  elsif tg_table_name = 'transactions' then
    -- The lock serializes wallet deletion against transaction writes.
    select currency into wallet_currency from public.wallets
      where id = new.wallet_id and user_id = new.user_id for share;
    if wallet_currency is null or wallet_currency <> new.currency then
      raise exception 'Choose your own wallet with the same currency';
    end if;
    if new.category_id is not null and not exists (
      select 1 from public.categories where id = new.category_id and user_id = new.user_id
    ) then
      raise exception 'Choose your own category';
    end if;
    if new.amount <= 0 or new.amount >= 1000000000000 or new.amount::text in ('NaN','Infinity','-Infinity') then
      raise exception 'Amount must be positive and finite';
    end if;
    if code in ('IDR','KRW','JPY') and new.amount <> trunc(new.amount) then
      raise exception 'This currency requires whole amounts';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists validate_profile_currency on public.profiles;
create trigger validate_profile_currency before insert or update on public.profiles
  for each row execute function public.validate_currency_record();
drop trigger if exists validate_wallet_currency on public.wallets;
create trigger validate_wallet_currency before insert or update on public.wallets
  for each row execute function public.validate_currency_record();
drop trigger if exists validate_transaction_currency on public.transactions;
create trigger validate_transaction_currency before insert or update on public.transactions
  for each row execute function public.validate_currency_record();
commit;
