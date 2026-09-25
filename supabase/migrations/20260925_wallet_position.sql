-- Simpan urutan wallet yang dapat diubah di halaman Wallets.
begin;

alter table public.wallets
  add column if not exists position integer;

with ordered_wallets as (
  select id, row_number() over (partition by user_id order by created_at, id) - 1 as position
  from public.wallets
)
update public.wallets as wallet
set position = ordered_wallets.position
from ordered_wallets
where wallet.id = ordered_wallets.id
  and wallet.position is null;

alter table public.wallets
  alter column position set default 0,
  alter column position set not null;

create index if not exists wallets_user_position_idx on public.wallets (user_id, position);

commit;
