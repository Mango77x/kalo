-- Sprint 5: calibración personal.
-- Al insertar un feedback ("less"/"correct"/"more") sobre una entrada,
-- ajusta el correction_multiplier de calibration_factors para la categoría
-- de esa entrada, mediante una media incremental que converge hacia el
-- feedback observado (más peso a las primeras muestras, se estabiliza según
-- crece sample_count). El "objetivo" de cada tipo de feedback es el factor
-- que habría hecho perfecta esa estimación puntual: 0.85 para "less", 1.15
-- para "more", 1.0 para "correct". Como el multiplicador siempre es una
-- media ponderada de valores dentro de [0.85, 1.15], nunca se sale de ese
-- rango sin necesidad de clamps explícitos.
create or replace function trg_calibration_feedback_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category_id uuid;
  v_target numeric;
  v_multiplier numeric;
  v_count integer;
begin
  select category_id into v_category_id
  from food_entries
  where id = new.food_entry_id;

  if v_category_id is null then
    return new;
  end if;

  v_target := case new.feedback
    when 'less' then 0.85
    when 'more' then 1.15
    else 1.0
  end;

  insert into calibration_factors (user_id, category_id, correction_multiplier, sample_count)
  values (new.user_id, v_category_id, 1.0, 0)
  on conflict (user_id, category_id) do nothing;

  select correction_multiplier, sample_count into v_multiplier, v_count
  from calibration_factors
  where user_id = new.user_id and category_id = v_category_id;

  update calibration_factors
  set correction_multiplier = v_multiplier + (v_target - v_multiplier) / (v_count + 1),
      sample_count = v_count + 1,
      updated_at = now()
  where user_id = new.user_id and category_id = v_category_id;

  return new;
end;
$$;

create trigger calibration_feedback_apply_trigger
  after insert on calibration_feedback
  for each row execute function trg_calibration_feedback_apply();
