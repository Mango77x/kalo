# PROGRESO — Kalo

Bitácora de desarrollo. Una entrada por sprint: qué se hizo, decisiones de
diseño y su porqué, y qué queda pendiente. Sirve para retomar el trabajo en otra
sesión sin leer todo el código.

---

## Estado global

| Sprint | Título                          | Estado        |
| ------ | ------------------------------- | ------------- |
| 0      | Setup del proyecto              | ✅ Completado |
| 1      | Autenticación y esqueleto       | ⬜ Pendiente  |
| 2      | Registro por texto libre        | ⬜ Pendiente  |
| 3      | Registro por foto               | ⬜ Pendiente  |
| 4      | Calendario e histórico          | ⬜ Pendiente  |
| 5      | Calibración personal            | ⬜ Pendiente  |
| 6      | PWA e instalación en iPhone     | ⬜ Pendiente  |
| 7      | Pulido de frontend (UX/UI)      | ⬜ Pendiente  |
| 8      | Deploy y CI/CD                  | ⬜ Pendiente  |

---

## 🔑 CREDENCIALES QUE NECESITO DE TI (bloqueantes)

Sin esto no puedo avanzar más allá del esqueleto:

1. **Proyecto Supabase** (bloquea Sprint 1 en adelante).
   - Crea un proyecto gratis en https://supabase.com (región Europa, ej.
     `eu-central-1`, para menos latencia).
   - Pásame: **Project URL** (`https://xxxx.supabase.co`) y la **anon public
     key** (Settings → API). Las pondré en `.env` (que no se versiona).
   - No me pases nunca la `service_role` key por aquí.

2. **API key de Anthropic / Claude** (bloquea Sprint 2 texto y Sprint 3 foto).
   - Créala en https://console.anthropic.com → API Keys.
   - No la pongas en el frontend ni me la pegues en el chat si prefieres:
     se configura como **secret de Supabase** en la Edge Function con
     `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`. Puedo dejarte el
     comando exacto cuando lleguemos ahí.

3. **Repositorio en GitHub** (para el push; ver sección Git abajo).

Mientras tanto, el proyecto compila y arranca en local sin credenciales
(la app fallará al tocar Supabase, que es lo esperado hasta el Sprint 1).

---

## Sprint 0 — Setup del proyecto ✅

### Qué se hizo

- Proyecto **Vite + React 19 + TypeScript** (plantilla `react-ts`).
- **Tailwind CSS v4** vía plugin oficial `@tailwindcss/vite` (no PostCSS).
  La config vive en `src/index.css` con `@theme` (Tailwind v4 es CSS-first,
  ya no usa `tailwind.config.js`).
- **ESLint 9 (flat config)** + **Prettier**. Sustituí `oxlint` (que trae la
  plantilla nueva de Vite) por ESLint + Prettier, que es lo que pediste.
- Estructura de carpetas: `src/components`, `src/pages`, `src/lib`,
  `src/hooks`, `src/types`.
- Cliente de Supabase tipado en `src/lib/supabase.ts` (lee las claves de
  `.env`; falla ruidosamente si faltan).
- Tipos de dominio en `src/types/index.ts` (mapeo 1:1 del esquema de Postgres
  del punto 3 del brief).
- `.env.example` documentado; `.env` real ignorado en `.gitignore`.
- App placeholder que verifica que Tailwind renderiza (probado en navegador).

### Decisiones de diseño y por qué

- **Tailwind v4 en vez de v3**: es la versión vigente, se integra como plugin
  de Vite (más rápido, sin `postcss.config`). shadcn/ui ya soporta v4.
- **`calories_min` / `calories_max` como columnas separadas** en vez de un JSON
  `confidence_range`: el brief permite ambas; separarlas facilita consultas y
  gráficas (Recharts) sin parsear JSON. La estimación por foto se mostrará como
  rango, no como número seco (requisito de UX de precisión).
- **Cliente Supabase tipado con `Database`** (stub en `src/types/database.ts`):
  se regenerará con `supabase gen types` cuando exista el esquema real.
- **`.env` no versionado**: la anon key sí es pública (protegida por RLS), pero
  la mantengo fuera del repo por higiene; la API key de Claude JAMÁS toca el
  frontend (irá en un secret de Supabase, Edge Function).

### Pendiente / notas para el siguiente sprint

- Sprint 1 necesita las credenciales de Supabase (ver sección de arriba).
- Añadir shadcn/ui cuando haya componentes reales que lo justifiquen
  (Sprint 1: inputs/botones de login). Se copiarán al repo, no como dep npm.

---

## 🐙 Git / GitHub — pasos para ti

Ya inicialicé el repositorio local y dejé el **commit inicial** hecho, con el
remoto `origin` configurado hacia `https://github.com/Mango77x/kalo.git`.

Para subirlo, haz tú estos pasos (necesitan tu cuenta de GitHub):

1. Crea el repo vacío en GitHub (sin README ni .gitignore, para no chocar):
   - Ve a https://github.com/new
   - Owner: `Mango77x` · Repository name: `kalo` · Visibilidad: la que quieras.
   - **No** marques "Add a README", "Add .gitignore" ni licencia.
   - Botón "Create repository".

2. Desde la carpeta del proyecto, sube la rama `main`:
   ```bash
   git push -u origin main
   ```
   Si te pide autenticación, usa tu Personal Access Token de GitHub
   (Settings → Developer settings → Tokens) como contraseña.

Cuando confirmes que está subido, sigo con el Sprint 1 en cuanto me pases las
credenciales de Supabase.
