-- Cada usuario aporta su propia API key de Anthropic (BYOK), para que un
-- registro publico no consuma la cuota del dueño del proyecto. La key vive
-- solo aqui (RLS: cada usuario ve/edita unicamente la suya) y solo la leen
-- las Edge Functions con el cliente autenticado del propio usuario; nunca
-- llega al frontend tras guardarse.
create table user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  anthropic_api_key text,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

create policy "user_settings: select propio"
  on user_settings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_settings: insert propio"
  on user_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_settings: update propio"
  on user_settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
