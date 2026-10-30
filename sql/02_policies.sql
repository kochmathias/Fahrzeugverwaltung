alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_shares enable row level security;
alter table public.monitor_types enable row level security;
alter table public.monitors enable row level security;
alter table public.monitor_entries enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_settings enable row level security;
alter table public.notification_log enable row level security;

drop policy if exists "Profiles read access" on public.profiles;
create policy "Profiles read access" on public.profiles for select using (true);

drop policy if exists "Profiles admin update" on public.profiles;
create policy "Profiles admin update" on public.profiles for update using (public.is_admin());

drop policy if exists "Vehicles select policy" on public.vehicles;
create policy "Vehicles select policy" on public.vehicles for select using (
  public.is_admin() or owner_id = auth.uid() or id in (select vehicle_id from public.vehicle_shares where user_id = auth.uid())
);

drop policy if exists "Vehicles insert policy" on public.vehicles;
create policy "Vehicles insert policy" on public.vehicles for insert with check (
  public.is_admin() or owner_id = auth.uid()
);

drop policy if exists "Vehicles update policy" on public.vehicles;
create policy "Vehicles update policy" on public.vehicles for update using (
  public.is_admin() or owner_id = auth.uid() or id in (select vehicle_id from public.vehicle_shares where user_id = auth.uid() and recht = 'edit')
);

drop policy if exists "Vehicles delete policy" on public.vehicles;
create policy "Vehicles delete policy" on public.vehicles for delete using (
  public.is_admin() or owner_id = auth.uid()
);

drop policy if exists "Shares manage policy" on public.vehicle_shares;
create policy "Shares manage policy" on public.vehicle_shares for all using (
  public.is_admin() or exists (select 1 from public.vehicles where id = vehicle_id and owner_id = auth.uid())
);

drop policy if exists "Monitor types read" on public.monitor_types;
create policy "Monitor types read" on public.monitor_types for select using (true);

drop policy if exists "Monitor types write" on public.monitor_types;
create policy "Monitor types write" on public.monitor_types for all using (public.is_admin());

drop policy if exists "Monitors select" on public.monitors;
create policy "Monitors select" on public.monitors for select using (
  public.is_admin() or exists (select 1 from public.vehicles v left join public.vehicle_shares s on s.vehicle_id = v.id where v.id = vehicle_id and (v.owner_id = auth.uid() or s.user_id = auth.uid()))
);

drop policy if exists "Monitors write" on public.monitors;
create policy "Monitors write" on public.monitors for all using (
  public.is_admin() or exists (select 1 from public.vehicles v left join public.vehicle_shares s on s.vehicle_id = v.id where v.id = vehicle_id and (v.owner_id = auth.uid() or (s.user_id = auth.uid() and s.recht = 'edit')))
);

drop policy if exists "Monitor entries select" on public.monitor_entries;
create policy "Monitor entries select" on public.monitor_entries for select using (
  public.is_admin() or exists (select 1 from public.monitors m join public.vehicles v on v.id = m.vehicle_id left join public.vehicle_shares s on s.vehicle_id = v.id where m.id = monitor_id and (v.owner_id = auth.uid() or s.user_id = auth.uid()))
);

drop policy if exists "Monitor entries write" on public.monitor_entries;
create policy "Monitor entries write" on public.monitor_entries for all using (
  public.is_admin() or exists (select 1 from public.monitors m join public.vehicles v on v.id = m.vehicle_id left join public.vehicle_shares s on s.vehicle_id = v.id where m.id = monitor_id and (v.owner_id = auth.uid() or (s.user_id = auth.uid() and s.recht = 'edit')))
);

drop policy if exists "Push subscriptions policy" on public.push_subscriptions;
create policy "Push subscriptions policy" on public.push_subscriptions for all using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Notification settings policy" on public.notification_settings;
create policy "Notification settings policy" on public.notification_settings for all using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Notification log policy" on public.notification_log;
create policy "Notification log policy" on public.notification_log for all using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" on storage.objects for select using (bucket_id = 'vehicle-images');

drop policy if exists "Authenticated Upload" on storage.objects;
create policy "Authenticated Upload" on storage.objects for insert with check (bucket_id = 'vehicle-images' and auth.role() = 'authenticated');

drop policy if exists "Owner Update Delete" on storage.objects;
create policy "Owner Update Delete" on storage.objects for update using (bucket_id = 'vehicle-images' and auth.role() = 'authenticated');