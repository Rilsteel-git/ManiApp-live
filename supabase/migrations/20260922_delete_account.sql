-- Self-service account deletion. Run once in the Supabase SQL Editor
-- after schema.sql (and multi_currency.sql, if already applied).
begin;

-- profiles/wallets/categories/transactions all reference auth.users(id)
-- with "on delete cascade" (see schema.sql), so deleting the auth.users
-- row is enough to wipe every table belonging to this user in one go.
create or replace function public.delete_my_account()
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

  delete from auth.users where id = uid;
end;
$func$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

commit;
