create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  benutzername text unique not null,
  name text not null,
  rolle text not null default 'user' check (rolle in ('admin', 'user')),
  aktiv boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.vehicles (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  bezeichnung text not null,
  marke text not null,
  modell text not null,
  kennzeichen text not null,
  fin text,
  erstzulassung date,
  km_stand integer default 0,
  bild_pfad text,
  notizen text,
  created_at timestamptz default now()
);

create table if not exists public.vehicle_shares (
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  recht text not null check (recht in ('view', 'edit')),
  primary key (vehicle_id, user_id)
);

create table if not exists public.monitor_types (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  icon text not null default 'shield',
  standard_intervall_monate integer,
  standard_intervall_km integer,
  vorlauf_tage integer default 60,
  intervall_pro_fahrzeug_pflicht boolean default false
);

create table if not exists public.monitors (
  id uuid default uuid_generate_v4() primary key,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  type_id uuid references public.monitor_types(id) on delete cascade not null,
  ablaufdatum date,
  intervall_monate integer,
  intervall_km integer,
  vorlauf_tage integer,
  naechste_faellig_km integer,
  unique (vehicle_id, type_id)
);

create table if not exists public.monitor_entries (
  id uuid default uuid_generate_v4() primary key,
  monitor_id uuid references public.monitors(id) on delete cascade not null,
  durchgefuehrt_am date not null,
  neues_ablaufdatum date,
  km_stand integer,
  kosten numeric(10,2),
  notiz text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subscription jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.notification_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  tage_vorher integer[] default array[60, 14, 0],
  aktiv boolean default true
);

create table if not exists public.notification_log (
  id uuid default uuid_generate_v4() primary key,
  monitor_id uuid references public.monitors(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  gesendet_am date not null,
  unique (monitor_id, user_id, gesendet_am)
);

create or replace function public.is_admin()
returns boolean
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and rolle = 'admin' and aktiv = true
  );
end;
$$ language plpgsql;

create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, benutzername, name, rolle, aktiv)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'benutzername', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', 'Neuer Nutzer'),
    coalesce(new.raw_user_meta_data->>'rolle', 'user'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict (id) do nothing;