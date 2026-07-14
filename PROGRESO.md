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
| 2      | Registro por texto libre     | ⬜ Pendiente  |
| 3      | Registro por foto            | ⬜ Pendiente  |
| 4      | Calendario e histórico       | ⬜ Pendiente  |
| 5      | Calibración personal         | ⬜ Pendiente  |
| 6      | PWA e instalación en iPhone  | ⬜ Pendiente  |
| 7      | Pulido de frontend (UX/UI)   | ⬜ Pendiente  |
| 8      | Deploy y CI/CD               | ⬜ Pendiente  |

Repo en GitHub: https://github.com/Mango77x/kalo (rama `main` al día,
`a548f76`).

---

## 🔑 CREDENCIALES QUE NECESITO DE TI (bloqueantes)

1. **API key de Anthropic / Claude** (bloquea Sprint 2 texto y Sprint 3 foto).
   - Créala en https://console.anthropic.com → API Keys.
   - No hace falta que me la pegues en el chat: cuando montemos la Edge
     Function la configuraremos como secret de Supabase con
     `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (te doy el comando
     exacto llegado el momento). Si prefieres pasármela ahora para que yo la
     configure, también vale.

Ya recibidas: Project URL + anon (publishable) key de Supabase, y la
contraseña de Postgres (guardada solo en `.env`, no versionado). Conexión
verificada: región **eu-west-1**, vía pooler de Supabase
(`aws-0-eu-west-1.pooler.supabase.com`).

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
