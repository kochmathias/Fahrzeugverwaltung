insert into public.monitor_types (name, icon, standard_intervall_monate, standard_intervall_km, vorlauf_tage, intervall_pro_fahrzeug_pflicht)
values
  ('§ 57a-Überprüfung (Pickerl)', 'shield-check', 12, null, 60, false),
  ('Verbandskasten', 'medkit', 60, null, 30, false),
  ('Warndreieck', 'triangle', 120, null, 30, false),
  ('Warnweste', 'vest', 60, null, 30, false),
  ('Vignette', 'ticket', 12, null, 30, false),
  ('Sondermaut', 'toll', 12, null, 30, false),
  ('Service / Ölwechsel', 'wrench', 12, 15000, 30, true),
  ('Versicherung', 'document-text', 12, null, 30, false),
  ('Reifenwechsel', 'disc', 6, null, 21, true)
on conflict do nothing;