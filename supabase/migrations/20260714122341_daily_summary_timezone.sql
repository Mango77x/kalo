-- Corrige el cálculo del "día" en daily_summaries: `consumed_at::date` usaba
-- la zona horaria de la sesión de Postgres (UTC por defecto en Supabase), lo
-- que desplaza un día las entradas registradas de madrugada en hora local.
-- Suposición documentada: usuario en zona horaria de España (Europe/Madrid).
-- Si esto cambia, ajustar aquí.
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
    and (consumed_at at time zone 'Europe/Madrid')::date = p_date
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
    perform recompute_daily_summary(new.user_id, (new.consumed_at at time zone 'Europe/Madrid')::date);
  elsif tg_op = 'UPDATE' then
    perform recompute_daily_summary(new.user_id, (new.consumed_at at time zone 'Europe/Madrid')::date);
    if (old.consumed_at at time zone 'Europe/Madrid')::date <> (new.consumed_at at time zone 'Europe/Madrid')::date
       or old.user_id <> new.user_id then
      perform recompute_daily_summary(old.user_id, (old.consumed_at at time zone 'Europe/Madrid')::date);
    end if;
  elsif tg_op = 'DELETE' then
    perform recompute_daily_summary(old.user_id, (old.consumed_at at time zone 'Europe/Madrid')::date);
  end if;
  return null;
end;
$$;
