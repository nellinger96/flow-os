-- Secure contract signing, hide private fields from the public contract page,
-- lock server-only profile fields, and clean up policies.
--
-- Additive only: no existing customer data is modified or deleted.
-- Backwards compatible with the currently deployed SignContract page, which calls
-- get_contract_by_token(token) and sign_contract_by_token(token, new_service_data).

-- ---------------------------------------------------------------------------
-- 1. Frozen copy of the contract at the moment it is signed
-- ---------------------------------------------------------------------------
alter table public.customers add column if not exists signed_contract jsonb;
alter table public.customers add column if not exists signed_at timestamptz;

-- Allow cents in contract totals (e.g. 75 guests x $18.50). Widening only:
-- every existing whole-dollar value is kept exactly.
alter table public.customers alter column job_price type numeric(12,2) using job_price::numeric(12,2);

-- ---------------------------------------------------------------------------
-- 2. Only these service_data keys are ever shown to the client
--    (kitchen notes, timeline, original SMS text, etc. stay private)
-- ---------------------------------------------------------------------------
create or replace function public.contract_public_service_data(sd jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from jsonb_each(coalesce(sd, '{}'::jsonb))
  where key in (
    'event_date', 'event_time', 'guest_count', 'price_per_head',
    'menu_entrees', 'menu_sides', 'menu_drinks', 'menu_desserts', 'menu_supplies',
    'selected_menu_items',
    'payment_plan', 'signed_by', 'signed_at', 'terms_accepted'
  )
$$;

-- Business name as the caterer set it in Settings (stored in auth metadata),
-- falling back to profiles.business_name
create or replace function public.business_name_for(owner uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'business_name'), ''),
    nullif(btrim(p.business_name), '')
  )
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = owner
$$;

-- ---------------------------------------------------------------------------
-- 3. Public contract lookup: returns only client-facing fields
-- ---------------------------------------------------------------------------
drop function if exists public.get_contract_by_token(uuid);

create function public.get_contract_by_token(token uuid)
returns table (
  full_name text,
  address text,
  city text,
  job_notes text,
  job_price numeric,
  status text,
  contract_url text,
  service_data jsonb,
  signed_contract jsonb,
  signed_at timestamptz,
  business_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.full_name,
    c.address,
    c.city,
    c.job_notes,
    c.job_price,
    c.status,
    c.contract_url,
    public.contract_public_service_data(c.service_data),
    c.signed_contract,
    c.signed_at,
    public.business_name_for(c.user_id)
  from public.customers c
  where c.public_token = token
    and token is not null
$$;

-- ---------------------------------------------------------------------------
-- 4. Signing: the client can only supply their name. Everything else comes
--    from the database, and a contract can only be signed once.
-- ---------------------------------------------------------------------------
create or replace function public.sign_contract(token uuid, signer_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.customers%rowtype;
  v_name text := btrim(coalesce(signer_name, ''));
  v_now timestamptz := now();
begin
  if token is null then
    raise exception 'Contract not found';
  end if;

  if length(v_name) < 3 or length(v_name) > 200 then
    raise exception 'Please type your full legal name to sign.';
  end if;

  select * into c
  from public.customers
  where public_token = token
  for update;

  if not found then
    raise exception 'Contract not found';
  end if;

  if c.contract_url = 'SIGNED_DIGITALLY' or c.signed_contract is not null then
    raise exception 'This contract has already been signed.';
  end if;

  update public.customers
  set
    status = 'sold',
    contract_url = 'SIGNED_DIGITALLY',
    signed_at = v_now,
    service_data = coalesce(c.service_data, '{}'::jsonb)
      || jsonb_build_object('signed_by', v_name, 'signed_at', v_now, 'terms_accepted', true),
    signed_contract = jsonb_build_object(
      'version', 1,
      'terms_version', 1,
      'business_name', public.business_name_for(c.user_id),
      'signed_by', v_name,
      'signed_at', v_now,
      'terms_accepted', true,
      'full_name', c.full_name,
      'address', c.address,
      'city', c.city,
      'job_notes', c.job_notes,
      'job_price', c.job_price,
      'service_data', public.contract_public_service_data(c.service_data)
    )
  where id = c.id;
end;
$$;

-- Old signature kept as a thin wrapper so the live page keeps working.
-- Only the signer's name is read from the payload; everything else is ignored.
create or replace function public.sign_contract_by_token(token uuid, new_service_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sign_contract(token, new_service_data ->> 'signed_by');
end;
$$;

-- Unused leftover overload that let anyone overwrite contract_url.
drop function if exists public.sign_contract_by_token(uuid, text);

revoke all on function public.contract_public_service_data(jsonb) from public, anon, authenticated;
revoke all on function public.business_name_for(uuid) from public, anon, authenticated;
revoke all on function public.get_contract_by_token(uuid) from public;
revoke all on function public.sign_contract(uuid, text) from public;
revoke all on function public.sign_contract_by_token(uuid, jsonb) from public;
grant execute on function public.get_contract_by_token(uuid) to anon, authenticated;
grant execute on function public.sign_contract(uuid, text) to anon, authenticated;
grant execute on function public.sign_contract_by_token(uuid, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Users can't grant themselves a subscription or set a Stripe account.
--    Edge functions (service_role) and the dashboard (postgres) still can.
--    Users may still clear stripe_account_id (the "Disconnect" button).
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_server_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.subscription_status := 'inactive';
      new.stripe_account_id := null;
    else
      if new.subscription_status is distinct from old.subscription_status then
        raise exception 'subscription_status can only be changed by the server';
      end if;
      if new.stripe_account_id is distinct from old.stripe_account_id
         and new.stripe_account_id is not null then
        raise exception 'stripe_account_id can only be set by the server';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_server_fields on public.profiles;
create trigger protect_profile_server_fields
  before insert or update on public.profiles
  for each row execute function public.protect_profile_server_fields();

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 6. Policy cleanup
-- ---------------------------------------------------------------------------
-- customers: remove duplicate policies; stop rows being reassigned to another user
drop policy if exists "policy_create_own_data" on public.customers;
drop policy if exists "policy_delete_own_data" on public.customers;
drop policy if exists "policy_update_own_data" on public.customers;
drop policy if exists "policy_view_own_data" on public.customers;
drop policy if exists "Users can update own customers" on public.customers;
create policy "Users can update own customers" on public.customers
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- services: two identical policies
drop policy if exists "Users can manage their own services" on public.services;

-- jobs: unused and was fully open to the public
alter table public.jobs enable row level security;
