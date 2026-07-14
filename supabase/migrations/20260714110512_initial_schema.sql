-- Esquema inicial de Kalo: categorías, entradas de comida, calibración y
-- resúmenes diarios cacheados. RLS activado desde el primer sprint que toca
-- datos reales (cada usuario solo ve sus propias filas).

-- === food_categories ===================================================
-- Taxonomía compartida (no tiene user_id). Gestionada por nosotros vía
-- migraciones/seed, no por el cliente.
create table food_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

alter table food_categories enable row level security;

create policy "food_categories: lectura para autenticados"
  on food_categories for select
  to authenticated
  using (true);

insert into food_categories (name) values
  ('arroces'),
  ('pastas'),
  ('carnes a la plancha'),
  ('carnes fritas o rebozadas'),
  ('pescados y mariscos'),
  ('huevos'),
  ('ensaladas'),
  ('verduras y hortalizas'),
  ('legumbres'),
  ('fruta'),
  ('lácteos'),
  ('pan y cereales'),
  ('snacks'),
  ('dulces y postres'),
  ('bebidas'),
  ('envasados'),
  ('comida rápida'),
  ('salsas y condimentos'),
  ('frutos secos'),
  ('otros');

-- === food_entries =======================================================
create table food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- fecha/hora real de la comida; puede diferir de created_at (ej. registro tardío)
  consumed_at timestamptz not null default now(),
  source text not null check (source in ('text', 'photo', 'barcode')),
  raw_input text,
  food_name text not null,
  estimated_grams numeric,
  -- rango de confianza: comunicamos estimación, no dato exacto (ver PROGRESO.md)
  calories_min numeric,
  calories_max numeric,
  calories numeric not null,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  category_id uuid references food_categories (id),
  nutrition_source text not null default 'ai_estimate'
    check (nutrition_source in ('open_food_facts', 'usda', 'ai_estimate'))
);

create index food_entries_user_consumed_idx
  on food_entries (user_id, consumed_at);

alter table food_entries enable row level security;

create policy "food_entries: select propias"
  on food_entries for select
  to authenticated
  using (auth.uid() = user_id);

create policy "food_entries: insert propias"
  on food_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "food_entries: update propias"
  on food_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "food_entries: delete propias"
  on food_entries for delete
  to authenticated
  using (auth.uid() = user_id);

-- === calibration_factors =================================================
create table calibration_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references food_categories (id) on delete cascade,
  correction_multiplier numeric not null default 1.0,
  sample_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

alter table calibration_factors enable row level security;

create policy "calibration_factors: select propias"
  on calibration_factors for select
  to authenticated
  using (auth.uid() = user_id);

create policy "calibration_factors: insert propias"
  on calibration_factors for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "calibration_factors: update propias"
  on calibration_factors for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- === calibration_feedback ================================================
-- Histórico crudo de feedback ("menos"/"bien"/"más"), antes de agregarlo al
-- multiplicador de calibration_factors.
create table calibration_feedback (
  id uuid primary key default gen_random_uuid(),
  food_entry_id uuid not null references food_entries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feedback text not null check (feedback in ('less', 'correct', 'more')),
  created_at timestamptz not null default now()
);

alter table calibration_feedback enable row level security;

create policy "calibration_feedback: select propias"
  on calibration_feedback for select
  to authenticated
  using (auth.uid() = user_id);

create policy "calibration_feedback: insert propias"
  on calibration_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

-- === daily_summaries ======================================================
-- Cacheado y recalculado por trigger para que calendario/histórico carguen
-- rápido sin sumar filas de food_entries en el cliente.
create table daily_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  total_calories numeric not null default 0,
  total_protein_g numeric not null default 0,
  total_carbs_g numeric not null default 0,
  total_fat_g numeric not null default 0,
  unique (user_id, date)
);

alter table daily_summaries enable row level security;

create policy "daily_summaries: select propias"
  on daily_summaries for select
  to authenticated
  using (auth.uid() = user_id);

-- Sin políticas de escritura para el cliente: solo la escribe el trigger
-- (security definer) de más abajo.

-- === Trigger: recalcular daily_summaries al cambiar food_entries ========
create or replace function recompute_daily_summary(p_user_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into daily_summaries (user_id, date, total_calories, total_protein_g, total_carbs_g, total_fat_g)
  select
    p_user_id,
    p_date,
    coalesce(sum(calories), 0),
    coalesce(sum(protein_g), 0),
    coalesce(sum(carbs_g), 0),
    coalesce(sum(fat_g), 0)
  from food_entries
  where user_id = p_user_id
    and consumed_at::date = p_date
  on conflict (user_id, date) do update set
    total_calories = excluded.total_calories,
    total_protein_g = excluded.total_protein_g,
    total_carbs_g = excluded.total_carbs_g,
    total_fat_g = excluded.total_fat_g;
end;
$$;

create or replace function trg_food_entries_daily_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform recompute_daily_summary(new.user_id, new.consumed_at::date);
  elsif tg_op = 'UPDATE' then
    perform recompute_daily_summary(new.user_id, new.consumed_at::date);
    if old.consumed_at::date <> new.consumed_at::date or old.user_id <> new.user_id then
      perform recompute_daily_summary(old.user_id, old.consumed_at::date);
    end if;
  elsif tg_op = 'DELETE' then
    perform recompute_daily_summary(old.user_id, old.consumed_at::date);
  end if;
  return null;
end;
$$;

create trigger food_entries_daily_summary_trigger
  after insert or update or delete on food_entries
  for each row execute function trg_food_entries_daily_summary();
