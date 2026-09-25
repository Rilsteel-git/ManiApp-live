-- ============================================================
-- Mani App — skema Supabase (Postgres + RLS)
-- Jalankan sekali di Supabase Dashboard > SQL Editor.
-- Aman dijalankan ulang: semua objek memakai IF NOT EXISTS / OR REPLACE.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- TABEL
-- ------------------------------------------------------------

-- Profil tampilan (nama + foto). Satu baris per akun auth.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text        not null default '',
  photo_url   text        not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.wallets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  name            text        not null check (length(btrim(name)) > 0),
  type            text        not null default 'cash' check (type in ('bank', 'e-wallet', 'cash')),
  -- Urutan tampil wallet (drag & drop di halaman Wallets).
  position        integer     not null default 0,
  -- Saldo berjalan TIDAK disimpan. Yang disimpan hanya saldo awal;
  -- saldo = initial_balance + income − expense (dihitung ulang di client).
  initial_balance numeric(16, 2) not null default 0,
  created_at      timestamptz not null default now()
);
alter table public.wallets add column if not exists position integer not null default 0;
create index if not exists wallets_user_id_idx on public.wallets (user_id);
create index if not exists wallets_user_position_idx on public.wallets (user_id, position);

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null check (length(btrim(name)) > 0),
  type        text        not null check (type in ('income', 'expense')),
  icon        text        not null default '✨',
  -- Urutan tampil kategori aktif per tipe (drag & drop di halaman Categories).
  position    integer     not null default 0,
  -- Kategori yang masih dipakai transaksi diarsipkan, bukan dihapus, supaya
  -- histori tetap menyimpan nama & ikonnya (soft reference, FR-3.4).
  archived    boolean     not null default false,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists categories_user_id_idx on public.categories (user_id);

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  -- Hapus wallet ikut menghapus transaksinya (cascade eksplisit, FR-1.5).
  wallet_id   uuid        references public.wallets (id) on delete cascade,
  -- Hapus kategori permanen hanya terjadi saat kategori belum dipakai; kalau
  -- pun terjadi, transaksi tetap ada dan tampil sebagai "Deleted category".
  category_id uuid        references public.categories (id) on delete set null,
  type        text        not null check (type in ('income', 'expense')),
  amount      numeric(16, 2) not null check (amount >= 0),
  note        text        not null default '',
  date        date        not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists transactions_user_id_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_wallet_id_idx on public.transactions (wallet_id);
create index if not exists transactions_category_id_idx on public.transactions (category_id);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY — tiap orang hanya melihat datanya sendiri
-- ------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.wallets      enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "profiles are self-service" on public.profiles;
create policy "profiles are self-service" on public.profiles
  for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "wallets are self-service" on public.wallets;
create policy "wallets are self-service" on public.wallets
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "categories are self-service" on public.categories;
create policy "categories are self-service" on public.categories
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions are self-service" on public.transactions;
create policy "transactions are self-service" on public.transactions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- AKUN BARU: buat profil + 11 kategori bawaan
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, type, icon, position)
  values
    (new.id, 'Food',          'expense', '🍜', 0),
    (new.id, 'Transport',     'expense', '🛵', 1),
    (new.id, 'Shopping',      'expense', '🛒', 2),
    (new.id, 'Bills',         'expense', '🧾', 3),
    (new.id, 'Health',        'expense', '💊', 4),
    (new.id, 'Entertainment', 'expense', '🎬', 5),
    (new.id, 'Other',         'expense', '✨', 6),
    (new.id, 'Salary',        'income',  '💼', 0),
    (new.id, 'Bonus',         'income',  '🎁', 1),
    (new.id, 'Freelance',     'income',  '📈', 2),
    (new.id, 'Other',         'income',  '✨', 3);

  return new;
end;
$func$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- RESET DATA (tombol "Reset all data" di halaman Profile).
-- Profil sengaja dipertahankan; kategori kembali ke bawaan.
-- ------------------------------------------------------------
create or replace function public.reset_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.transactions where user_id = uid;
  delete from public.wallets      where user_id = uid;
  delete from public.categories   where user_id = uid;

  insert into public.categories (user_id, name, type, icon, position)
  values
    (uid, 'Food',          'expense', '🍜', 0),
    (uid, 'Transport',     'expense', '🛵', 1),
    (uid, 'Shopping',      'expense', '🛒', 2),
    (uid, 'Bills',         'expense', '🧾', 3),
    (uid, 'Health',        'expense', '💊', 4),
    (uid, 'Entertainment', 'expense', '🎬', 5),
    (uid, 'Other',         'expense', '✨', 6),
    (uid, 'Salary',        'income',  '💼', 0),
    (uid, 'Bonus',         'income',  '🎁', 1),
    (uid, 'Freelance',     'income',  '📈', 2),
    (uid, 'Other',         'income',  '✨', 3);
end;
$func$;

revoke all on function public.reset_my_data() from public;
grant execute on function public.reset_my_data() to authenticated;

-- ------------------------------------------------------------
-- STORAGE: foto profil. Tiap file wajib berada di folder <user-id>/
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar images are public" on storage.objects;
create policy "avatar images are public" on storage.objects
  for select to public using (bucket_id = 'avatars');

drop policy if exists "users manage their own avatar" on storage.objects;
create policy "users manage their own avatar" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
