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
`96d8f9b`).

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
contraseña de Postgres (guardada solo en `.env`, no versionado — se usará si
hace falta el CLI de Supabase para migraciones/link del proyecto).

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

- Sprint 2 (registro por texto libre) necesita: (a) crear el esquema de tablas
  en Supabase (`food_entries`, `food_categories`, etc. — con RLS desde el
  principio, según el brief), y (b) la Edge Function que interpreta texto
  libre. Para lo primero puedo usar el CLI de Supabase (tengo ya la conexión),
  o dejarte el SQL para que lo ejecutes tú en el SQL Editor si prefieres no
  darme más acceso.
- API key de Anthropic pendiente (ver credenciales arriba) — no bloquea el
  arranque de Sprint 2 si empiezo por el esquema de datos primero.
