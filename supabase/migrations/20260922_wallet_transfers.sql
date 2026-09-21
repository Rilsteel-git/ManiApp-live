-- Wallet-to-wallet transfers. Run once in the Supabase SQL Editor after
-- schema.sql (and the earlier migrations, if already applied).
begin;

-- A transfer is stored as two ordinary rows (one expense leg on the source
-- wallet, one income leg on the destination wallet) so wallet balances stay
-- correct with zero extra logic. `is_transfer` lets reports exclude both
-- legs from income/expense totals and category breakdowns; `transfer_pair_id`
-- links the two rows together.
alter table public.transactions
  add column if not exists is_transfer boolean not null default false,
  add column if not exists transfer_pair_id uuid;

create index if not exists transactions_transfer_pair_idx
  on public.transactions (transfer_pair_id)
  where transfer_pair_id is not null;

commit;
