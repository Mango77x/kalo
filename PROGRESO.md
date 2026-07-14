# PROGRESO — Kalo

Bitácora de desarrollo. Una entrada por sprint: qué se hizo, decisiones de
diseño y su porqué, y qué queda pendiente. Sirve para retomar el trabajo en otra
sesión sin leer todo el código.

---

## Estado global

| Sprint | Título                       | Estado        |
| ------ | ---------------------------- | ------------- |
| 0      | Setup del proyecto           | ✅ Completado |
| 1      | Autenticación y esqueleto    | ✅ Completado |
| 2      | Registro por texto libre     | ✅ Completado |
| 3      | Registro por foto            | ⬜ Pendiente  |
| 4      | Calendario e histórico       | ⬜ Pendiente  |
| 5      | Calibración personal         | ⬜ Pendiente  |
| 6      | PWA e instalación en iPhone  | ⬜ Pendiente  |
| 7      | Pulido de frontend (UX/UI)   | ⬜ Pendiente  |
| 8      | Deploy y CI/CD               | ⬜ Pendiente  |

Repo en GitHub: https://github.com/Mango77x/kalo (rama `main` al día,
`b0aae47`).

---

## 🔑 CREDENCIALES

Todas las credenciales necesarias hasta ahora ya están recibidas y
configuradas: Project URL + anon (publishable) key de Supabase, contraseña de
Postgres, API key de Anthropic (configurada como secret de la Edge Function
`log-text-entry` en Supabase, no vive en el frontend), y un Personal Access
Token de Supabase (usado solo puntualmente para desplegar funciones vía CLI;
guardado localmente en `.supabase_access_token`, gitignored, no persiste en
ningún fichero versionado).

Conexión DB verificada: región **eu-west-1**, vía pooler de Supabase
(`aws-0-eu-west-1.pooler.supabase.com`).

Nada bloqueante ahora mismo para seguir con Sprint 3.

---

## Sprint 1 — Autenticación y esqueleto de la app ✅

### Qué se hizo

- **Auth con magic link de Supabase** (`src/hooks/useAuth.tsx`): contexto
  React que expone `session`, `loading`, `signInWithEmail`, `signOut`.
  Se suscribe a `onAuthStateChange` para reflejar login/logout al instante
  (incluye el caso del enlace mágico completando el login en otra pestaña).
- **Pantalla de login** (`src/pages/Login.tsx`): input de email +
  `signInWithOtp`. Probado en real contra el proyecto Supabase — el envío del
  magic link funciona sin errores.
- **Rutas protegidas** (`src/components/ProtectedRoute.tsx`): sin sesión,
  redirige a `/login`; muestra spinner mientras se resuelve la sesión inicial.
  Verificado en navegador: sin sesión, cualquier ruta cae a `/login`.
- **Navegación** (`src/components/TabBar.tsx` + `Layout.tsx`): tab bar inferior
  fija con 3 pestañas (Hoy / Calendario / Histórico), pensada para uso a una
  mano en móvil. Header con email de la sesión activa y botón de logout.
- Páginas placeholder `Today.tsx`, `CalendarPage.tsx`, `History.tsx` — se
  rellenan en Sprints 2-4.
- Añadida dependencia `react-router-dom` (necesaria para rutas/navegación, no
  estaba explícita en el stack del brief pero es el estándar de facto con
  Vite+React).

### Decisiones de diseño y por qué

- **Dos commits, uno por historia de usuario** (auth por un lado, navegación
  por otro), tal como pide la metodología, aunque se implementaron en la misma
  sesión.
- **Contexto de Auth en un único fichero `useAuth.tsx`** (provider + hook):
  ESLint avisa (warning, no error) de que mezcla exports de componente y
  función por `react-refresh`; es un patrón común y aceptable para contextos
  pequeños, no lo separé para no añadir un fichero extra sin necesidad real.
  Si el contexto crece, se puede separar el `AuthContext` a su propio fichero.
- **`emailRedirectTo: window.location.origin`**: al hacer clic en el magic
  link vuelves al mismo origen desde el que pediste el login (local en dev,
  el dominio de producción una vez desplegado).
- **Verificación**: confirmé en el navegador (Browser pane) que (1) sin sesión
  todas las rutas redirigen a `/login`, y (2) el envío real del magic link
  contra el Supabase configurado no da error. **No verifiqué visualmente el
  tab bar ya autenticado** porque requeriría clicar el enlace del email real;
  te pido que hagas esa comprobación manual una vez lo despliegues o lo
  pruebes en local (`npm run dev`, pide el enlace, ábrelo, deberías ver el tab
  bar con Hoy/Calendario/Histórico).

### Pendiente / notas para el siguiente sprint

- API key de Anthropic pendiente (ver credenciales arriba) — no bloquea el
  arranque de Sprint 2 si empiezo por el esquema de datos primero.

---

## Esquema de base de datos ✅

### Qué se hizo

- Migración `supabase/migrations/20260714110512_initial_schema.sql` aplicada
  al proyecto Supabase real (no solo documentada): `food_categories` (con seed
  de 20 categorías iniciales), `food_entries`, `calibration_factors`,
  `calibration_feedback`, `daily_summaries`.
- **RLS activado en las 5 tablas** desde el principio. `food_categories` es de
  lectura pública para usuarios autenticados (taxonomía compartida, sin
  `user_id`); el resto restringe select/insert/update/delete a
  `auth.uid() = user_id`.
- **Trigger `food_entries_daily_summary_trigger`**: en cada insert/update/delete
  de `food_entries` recalcula la fila correspondiente de `daily_summaries` (vía
  función `security definer`), para que el calendario/histórico no tengan que
  sumar filas en cliente.
- `src/types/database.ts` escrito a mano reflejando el esquema exacto (el
  `gen types` automático del CLI de Supabase requiere Docker Desktop, no
  disponible en este entorno — si en algún momento tienes Docker corriendo en
  tu máquina, se puede regenerar automáticamente con el comando que dejo
  comentado en el propio fichero).

### Decisiones de diseño y por qué

- **Conexión vía pooler de Supabase (Supavisor), no conexión directa**: la
  conexión directa (`db.<ref>.supabase.co`) solo resuelve por IPv6 en este
  entorno y falló; el pooler (`aws-0-eu-west-1.pooler.supabase.com`, puerto
  5432, usuario `postgres.<project-ref>`) funciona por IPv4 sin problema. Si
  en el futuro hace falta conectar por CLI de nuevo, usar esta forma.
- **Verificación de RLS**: hice una petición REST anónima a `food_categories`
  (sin sesión) y confirmé que devuelve `[]` — la política `to authenticated`
  bloquea correctamente el acceso sin login, incluso a datos de solo lectura.
- **`daily_summaries` sin políticas de escritura para el cliente**: solo el
  trigger (función `security definer`) puede escribir en esa tabla; el
  cliente únicamente puede hacer `select` de sus propias filas.

---

## Sprint 2 — Registro por texto libre ✅

### Qué se hizo

- **Edge Function `log-text-entry`** (`supabase/functions/log-text-entry/`):
  recibe `{ rawInput }`, llama a **Claude Sonnet** (tool use forzado, no texto
  libre de respuesta) para identificar cada alimento/plato distinto, estimar
  gramaje/macros y asignar una categoría de la lista real de
  `food_categories`. Inserta una fila en `food_entries` por alimento
  detectado, usando el cliente Supabase con el JWT del propio usuario (no
  `service_role`), por lo que RLS se aplica igual que si lo hiciera el
  frontend.
- **`supabase/functions/_shared/anthropic.ts`**: cliente mínimo de la
  Messages API con tool use forzado; genérico en el contenido del mensaje
  (string o bloques con imagen) para reutilizarlo en el Sprint 3 (foto) sin
  duplicar lógica de llamada/parseo de la respuesta.
- **Vista "Hoy"** (`src/pages/Today.tsx`): formulario de texto
  (`TextEntryForm.tsx`) que invoca la Edge Function, lista de entradas del
  día (`FoodEntryCard.tsx`, muestra el rango de calorías cuando existe) y
  totales de calorías/macros.
- **`useTodayEntries`**: fetch inicial + suscripción **Realtime** a
  `food_entries` filtrada por `user_id`, con filtrado adicional en cliente
  por rango de fecha de hoy. Cualquier entrada nueva (desde este dispositivo
  u otro) aparece al instante sin recargar.
- Desplegada al proyecto real (`supabase functions deploy --use-api`, sin
  Docker) y secret `ANTHROPIC_API_KEY` configurado
  (`supabase secrets set`).

### Decisiones de diseño y por qué

- **Cambié de plan a mitad de sprint**: había empezado un parser heurístico
  en español (regex + tabla de raciones + búsqueda en USDA) para no depender
  de la API key de Claude, que aún no tenía. En cuanto recibiste la key,
  deseché ese parser (menos robusto, mucho código para mantener) y usé Claude
  directamente — el propio brief permite este enfoque para texto libre, y
  además sienta la base común para el Sprint 3, que sí exige Claude sí o sí.
- **`nutrition_source = 'ai_estimate'` para todas las entradas de texto**: no
  hay cruce con Open Food Facts/USDA en esta versión. La estrategia de 3
  pasos del brief (envasado→OFF, fresco→USDA, fallback→IA) tiene más sentido
  para fotos de producto/plato que para una descripción en texto ya dada por
  el usuario; lo dejo así por simplicidad y lo reconsidero si hace falta más
  precisión en un producto envasado concreto (backlog).
- **No apliqué el multiplicador de calibración todavía**: `calibration_factors`
  existe en el esquema pero su lógica de corrección es del Sprint 5. Insertar
  el valor crudo de Claude ahora es correcto; el Sprint 5 modificará el punto
  de inserción para multiplicar por el factor de la categoría antes de
  guardar.
- **Modelo usado**: `claude-sonnet-5` (el Sonnet vigente a día de hoy).
- **Despliegue de Edge Functions y secrets requiere un Personal Access Token**
  de Supabase (distinto de la anon key/contraseña de DB), no solo la
  contraseña de Postgres. Me lo pasaste puntualmente; lo guardé en un fichero
  local gitignored (`.supabase_access_token`) en vez de en el propio comando,
  para que no quedara expuesto en ningún log/transcripción.
- **Verificación**: confirmé que la función está desplegada y viva —una
  llamada sin token de usuario válido devuelve 401 (rechaza correctamente
  llamadas no autenticadas). **No pude probar el flujo completo de extremo a
  extremo** (escribir texto real y ver la entrada aparecer) porque requiere
  una sesión de usuario real, y no tengo forma de completar el login por
  magic link (necesitaría acceder a tu email). Te pido que lo pruebes tú:
  entra con tu sesión, escribe algo como "2 huevos y una tostada con
  aguacate" en la vista Hoy, y confírmame si aparece correctamente con
  nutrientes razonables.

### Pendiente / notas para el siguiente sprint

- **Pendiente de tu verificación manual**: probar el registro por texto en
  real (ver arriba). Si Claude devuelve algo raro o la función falla, dime el
  mensaje de error exacto que veas y lo reviso.
- Sprint 3 (foto): reutilizará `_shared/anthropic.ts` y seguramente
  `_shared/cors.ts`; solo cambia el contenido del mensaje (imagen base64 +
  prompt de estimación visual) y la función de compresión de imagen en
  cliente (`browser-image-compression`, aún no instalada).
