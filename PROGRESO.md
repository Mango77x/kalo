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
| 3      | Registro por foto            | ✅ Completado |
| 4      | Calendario e histórico       | ✅ Completado |
| 5      | Calibración personal         | ✅ Completado |
| 6      | PWA e instalación en iPhone  | ✅ Completado |
| 7      | Pulido de frontend (UX/UI)   | ✅ Completado |
| 8      | Deploy y CI/CD               | ✅ Completado y verificado en producción |

App en producción: **https://mango77x.github.io/kalo/**
Repo en GitHub: https://github.com/Mango77x/kalo (rama `main` al día,
`3a746b8`).

---

## 🔑 CREDENCIALES Y ESTADO

Todo lo de infraestructura está configurado y verificado en real (no solo en
local): Supabase (Auth, DB, Edge Functions, Storage no usado), GitHub Pages +
Actions, Resend (SMTP propio, sin límite de emails), Google OAuth.

- **API key de Anthropic: ya NO es un secret compartido del proyecto.** Desde
  el sprint de BYOK, cada usuario mete la suya en Ajustes (⚙️ en el header) y
  se guarda cifrada (ver más abajo). El antiguo bloqueante de "saldo de
  Anthropic agotado" ya no aplica al proyecto en sí — cada persona gestiona su
  propia cuenta y su propio saldo.
- **Login**: magic link (con SMTP propio de Resend, sin límite de 2
  emails/hora) y login con Google (OAuth configurado y verificado
  end-to-end). Sesión persistente (`persistSession: true`).
- **Personal Access Token de Supabase** (uso puntual para CLI/deploys de
  Edge Functions): guardado en `.supabase_access_token`, gitignored, nunca en
  el repo.

Conexión DB verificada: región **eu-west-1**, vía pooler de Supabase
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

---

## Sprint 3 — Registro por foto ✅

### Qué se hizo

- **Refactor previo**: extraje a `supabase/functions/_shared/food-entries.ts`
  todo lo que `log-text-entry` y la nueva `log-photo-entry` tienen en común
  (cliente autenticado con el JWT del usuario, carga de categorías, mapeo de
  categoría, construcción de filas, esquema de la herramienta de Claude). De
  paso corregí un detalle: la validación del body ocurría antes que la
  comprobación de auth, así que una petición sin sesión con body vacío
  devolvía 400 en lugar de 401 (sin impacto de seguridad real —RLS protege
  igual— pero no era el código HTTP correcto).
- **Edge Function `log-photo-entry`**: recibe `{ imageBase64, mediaType }`,
  envía la imagen a Claude Sonnet junto con un prompt de estimación visual, e
  inserta una fila por alimento detectado (mismo flujo que texto).
- **`PhotoEntryForm.tsx`**: input de cámara nativo
  (`<input type="file" accept="image/*" capture="environment">`, sin
  librerías de cámara custom, tal como pide el brief) + compresión en cliente
  con `browser-image-compression` (max 0.5MB, 1280px) antes de convertir a
  base64 y subir.
- `FoodEntryCard` ahora muestra un icono según el origen de la entrada
  (✏️ texto, 📷 foto, 🔖 barcode).
- Ambas funciones desplegadas y verificadas: rechazan consistentemente
  peticiones sin sesión con 401.

### Decisiones de diseño y por qué

- **Prompt de visión más conservador que el de texto**: instruye
  explícitamente no asumir raciones grandes salvo evidencia visual clara, ser
  conservador con la proteína, y NO leer etiquetas/texto visible en la foto
  salvo que sea justamente un producto envasado con etiqueta legible (en ese
  caso, sí usarla como fuente fiable). Esto sigue al pie de la letra las
  consideraciones de precisión del brief: la estimación de porciones por foto
  es el eslabón más débil (hasta ~40% de error), así que el rango de
  calorías que pide Claude es más ancho que en texto (±25-30% en vez de
  ±15-20%).
- **`nutrition_source = 'ai_estimate'` también para foto** (igual que texto):
  no hay integración real con Open Food Facts por barcode en esta versión
  (eso requeriría detección + escaneo de código de barras, fuera de alcance
  de "hacer una foto del plato"). Si en el futuro se añade escaneo de
  barcode como método de entrada aparte, ahí sí tendría sentido
  `nutrition_source = 'open_food_facts'`.
- **Sin aplicar aún el multiplicador de calibración** (igual que en Sprint 2):
  se implementa en el Sprint 5.
- **Verificación**: confirmé que ambas Edge Functions están desplegadas y
  rechazan correctamente peticiones sin sesión (401). **No pude probar el
  flujo real de sacar una foto y ver la estimación** porque no tengo cámara
  ni acceso a tu sesión logueada. Te pido que lo pruebes tú cuando puedas:
  entra con tu sesión, pulsa "Hacer foto de la comida", y dime si la
  estimación te parece razonable (y si el rango de calorías se ve en la
  tarjeta).

### Pendiente / notas para el siguiente sprint

- **Pendiente de tu verificación manual**: probar registro por foto en real
  (ver arriba), además de la prueba de texto libre del Sprint 2 si aún no la
  hiciste.
- Sprint 4 (calendario e histórico) usará `daily_summaries` (ya recalculado
  por trigger desde el Sprint de esquema de BD) para que las gráficas no
  tengan que sumar filas de `food_entries` en cliente.

---

## Nota: intento de cambiar a email+password (revertido)

Entre el Sprint 3 y el 4, al toparte con el límite de emails intentando
loguearte, probamos temporalmente pasar de magic link a email+password para
evitar depender del envío de correos. Se implementó, pero:

- Activar `mailer_allow_unverified_email_sign_ins` no bastaba: el propio
  `signUp()` sigue intentando enviar el email de confirmación dentro de la
  misma llamada, y ese envío choca igual con el límite si ya estaba agotado.
- Subir `rate_limit_email_sent` requiere configurar SMTP propio en Supabase
  (lo rechaza explícitamente sin esas credenciales).
- Decidiste volver a magic link. Revertí el código (useAuth.tsx, Login.tsx,
  Layout.tsx) a su versión del Sprint 1 y revertí
  `mailer_allow_unverified_email_sign_ins` a `false`. No quedó nada de esto
  commiteado (el árbol de trabajo coincidía exactamente con HEAD tras
  revertir).
- Conclusión útil: la sesión ya persistía desde el Sprint 0
  (`persistSession: true`), así que una vez lograste entrar por magic link,
  no deberías necesitar otro email salvo que la sesión expire o cambies de
  dispositivo/navegador.

---

## Sprint 4 — Calendario e histórico ✅

### Qué se hizo

- **`useEntriesForDate(date)`**: generaliza el hook de "Hoy" (Sprint 2) para
  aceptar cualquier fecha, con la misma suscripción Realtime. `useTodayEntries`
  pasa a ser un wrapper de una línea con `date = hoy`.
- **`CalendarPage`**: `react-day-picker` (locale español, días futuros
  deshabilitados) para elegir cualquier día pasado; muestra las entradas y
  totales de ese día reutilizando `FoodEntryCard`.
- **`useDailySummaries(days)`**: lee de `daily_summaries` (no de
  `food_entries`) para los últimos 7/30 días, sin sumar filas en cliente.
- **`History`**: toggle 7/30 días, gráfica de área para calorías
  (`CaloriesTrendChart`) y barras apiladas para macros
  (`MacrosBarChart`), con Recharts. Los días sin registros se rellenan a
  cero para que el eje temporal sea continuo.
- **Corrección de zona horaria en el trigger de `daily_summaries`**: el
  cálculo original (`consumed_at::date`) usaba la zona horaria de sesión de
  Postgres (UTC), lo que desplazaría un día las entradas de madrugada en
  hora local. Nueva migración fuerza `Europe/Madrid` (suposición documentada
  en el propio SQL — ajustar si cambia).

### Decisiones de diseño y por qué

- **Antes de tocar código de gráficas, consulté la skill de dataviz del
  proyecto** (paleta validada colorblind-safe, reglas de forma/color/marcas).
  Los colores de `src/lib/chartColors.ts` vienen de esa paleta de referencia,
  no inventados a ojo.
- **Un eje por gráfica** (calorías y macros van en gráficas separadas, no una
  sola con doble eje Y), siguiendo la regla de la skill de evitar
  dual-axis.
- **Calendario usa `food_entries` directamente (vía `useEntriesForDate`), no
  `daily_summaries`**: necesita la lista de entradas igualmente, así que
  reutiliza el mismo hook que "Hoy" y evita una consulta extra; además no
  tiene el problema de zona horaria porque compara timestamps directamente,
  no la columna `date` calculada en el servidor.
- **Histórico sí usa `daily_summaries`**: aquí no hace falta el detalle de
  cada entrada, solo el agregado — exactamente el caso que justifica la
  tabla cacheada del brief.
- **Verificación**: build y lint limpios; confirmé que la app no rompe en el
  flujo sin sesión (sigue redirigiendo a `/login`). **No pude verificar
  visualmente el calendario ni las gráficas con datos reales** porque
  requiere una sesión logueada y, sobre todo, entradas reales en
  `food_entries` — que a día de hoy no existen porque el bloqueante de
  crédito de Anthropic (ver arriba) impide que se guarde ninguna entrada
  todavía. En cuanto resuelvas el crédito y registres algo (texto o foto),
  te pido que eches un vistazo también al calendario y al histórico.

### Pendiente / notas para el siguiente sprint

- **Bloqueante activo**: crédito de Anthropic (ver sección de arriba). Nada
  de lo construido en Sprints 2-4 se puede probar con datos reales hasta
  resolverlo.
- Sprint 5 (calibración) añadirá los botones de feedback por entrada y la
  lógica de `calibration_factors`; para probarlo hará falta que existan
  entradas reales primero.
- El bundle de producción ya pesa ~960KB (Recharts + react-day-picker); el
  aviso de Vite sobre code-splitting lo dejo para el Sprint 7 (pulido).

---

## Sprint 5 — Calibración personal ✅

### Qué se hizo

- **Migración `supabase/migrations/20260714150000_calibration_feedback_trigger.sql`**:
  trigger `calibration_feedback_apply_trigger` que, al insertar una fila en
  `calibration_feedback`, ajusta `calibration_factors.correction_multiplier`
  de la categoría de esa entrada mediante una media incremental que converge
  hacia el feedback observado (objetivo 0.85 para "less", 1.0 para
  "correct", 1.15 para "more"), con paso decreciente según crece
  `sample_count`. Como el multiplicador es siempre una media ponderada de
  valores dentro de [0.85, 1.15], nunca se sale de ese rango sin necesidad de
  clamps explícitos. Función `security definer`, mismo patrón que el trigger
  de `daily_summaries`.
- **`_shared/food-entries.ts`**: nueva `fetchCalibrationFactors(supabase,
  userId)` (lee `calibration_factors` del usuario en un `Map<category_id,
  multiplier>`) y `buildEntryRows` ahora multiplica calorías/macros por el
  factor de la categoría asignada (1 si no hay factor todavía) antes de
  insertar. Ambas Edge Functions (`log-text-entry`, `log-photo-entry`) cargan
  los factores del usuario antes de construir las filas.
- **UI de feedback**: `FoodEntryCard` muestra tres botones ("− Menos / ✓ Bien
  / + Más") bajo cada entrada sin feedback todavía; al pulsar uno, inserta la
  fila en `calibration_feedback` (vía `useEntriesForDate.submitFeedback`,
  usado tanto en `Today` como en `CalendarPage`) y pasa a mostrar el
  feedback ya dado en su lugar (para no reenviarlo dos veces sobre la misma
  entrada). El hook precarga el feedback existente de las entradas
  visibles con una sola consulta a `calibration_feedback`.

### Decisiones de diseño y por qué

- **Media incremental en vez de un simple `+/- 0.05` fijo**: un ajuste fijo
  no converge (oscila para siempre); la media incremental
  (`nuevo = actual + (objetivo - actual) / (n + 1)`) da más peso a las
  primeras muestras y se estabiliza según se acumula feedback, sin
  necesidad de un cron ni de recalcular en batch.
- **El multiplicador se aplica solo en el momento de insertar una entrada
  nueva** (no retroactivamente sobre entradas ya guardadas): es coherente
  con que `calories`/`calories_min`/`calories_max` en `food_entries`
  representan lo que se mostró y se sumó en su momento; recalcular hacia
  atrás mezclaría el histórico con calibraciones que aún no existían cuando
  se registró esa comida.
- **Feedback solo una vez por entrada**: no hay constraint `unique` en BD
  para esto (una entrada podría en teoría recibir varias filas de
  feedback), pero la UI lo evita ocultando los botones tras la primera
  respuesta — es la fuente de la señal la que debe ser de una vez, no una
  restricción de integridad que además complicaría reintentos legítimos si
  algún día se permite corregir el feedback dado.
- **No añadí un botón para deshacer/cambiar el feedback ya dado**: fuera de
  alcance de "aprender de tu feedback" tal como lo pide el brief; si hace
  falta corregir un feedback erróneo, se puede añadir en el Sprint 7
  (pulido).
- **Verificación**: build, lint y `tsc --noEmit` limpios. Me pasaste de
  nuevo el Personal Access Token de Supabase (guardado otra vez en
  `.supabase_access_token`, gitignored); con él apliqué la migración
  (`supabase db push`) y desplegué ambas Edge Functions
  (`supabase functions deploy --use-api`) al proyecto real. Confirmé que
  las dos siguen rechazando peticiones sin sesión con 401. **No pude
  probar el flujo real completo** (dar feedback y comprobar que el
  multiplicador se aplica en la siguiente entrada de esa categoría) porque
  requiere una sesión de usuario real.

### Pendiente / notas para el siguiente sprint

- **Pendiente de tu verificación manual**: registra algo, dale feedback
  "Menos" un par de veces a la misma categoría, y confirma que la siguiente
  estimación de esa categoría sale más baja (puedes consultar
  `calibration_factors` en el dashboard de Supabase para ver el
  `correction_multiplier` subir/bajar).
- Sprint 6 (PWA) y Sprint 7 (pulido) siguen pendientes tal cual estaban.

---

## Sprint 6 — PWA e instalación en iPhone ✅

### Qué se hizo

- **`vite-plugin-pwa`** (`vite.config.ts`): genera `manifest.webmanifest` y un
  service worker (`generateSW`, `registerType: 'autoUpdate'`) que precachea
  el app shell (JS/CSS/HTML/iconos) para que la carga inicial sea instantánea
  una vez instalada.
- **Iconos** (`public/icons/icon-192.png`, `icon-512.png`,
  `icon-512-maskable.png`, `public/apple-touch-icon.png`): generados a partir
  del propio `favicon.svg` existente (la marca morada en forma de "K"), no
  inventé una marca nueva. Los raricé a PNG con `sharp` (dependencia
  temporal, instalada y desinstalada solo para este paso — no queda en
  `package.json`) porque el entorno no tenía ninguna herramienta de
  conversión SVG→PNG disponible.
- **`index.html`**: añadido `<link rel="apple-touch-icon">` y las meta
  `apple-mobile-web-app-capable` / `-status-bar-style` / `-title`. Safari en
  iOS no lee `manifest.webmanifest` para "Añadir a pantalla de inicio": solo
  respeta estas etiquetas explícitas, así que son imprescindibles aparte del
  manifest (que sí cubre Chrome/Android y el resto).

### Decisiones de diseño y por qué

- **Sin `runtimeCaching`/estrategia offline para datos**: esta app depende
  por completo de Supabase (auth, Realtime, Edge Functions) — cachear esas
  respuestas serviría comida/calorías obsoletas o rotas sin conexión, peor
  que no tener nada. El único objetivo aquí es la instalabilidad (icono en
  el home screen, modo `standalone` sin barra de navegador, carga rápida del
  shell), no soporte offline real.
- **Iconos derivados del favicon.svg existente, con fondo lavanda claro
  (`#f6f2ff`)**, no del emoji 🥗 usado en `Login.tsx`: el favicon ya era el
  asset de marca "oficial" del proyecto (creado en Sprint 0); reusarlo evita
  introducir una segunda identidad visual sin que me lo pidieras. El fondo
  lavanda toma uno de los tonos que ya aparecen en los blobs decorativos del
  propio SVG.
- **`background_color`/`theme_color` del manifest**: `background_color`
  (`#f6f2ff`, el mismo lavanda del icono) es el color de splash screen
  mientras carga la app instalada; `theme_color` (`#16a34a`) es el verde de
  marca ya usado en toda la UI (`--color-brand` en `index.css`) — se ven en
  sitios distintos, no hacía falta que coincidieran.
- **Verificación**: `npm run build` genera correctamente
  `dist/manifest.webmanifest`, `dist/sw.js` y `dist/registerSW.js`;
  confirmé a mano el contenido del manifest (nombre, iconos, `lang: es`).
  **No pude probar la instalación real en un iPhone** (necesita HTTPS en un
  dominio público, que llega con el Sprint 8) ni verificar visualmente el
  ícono en un home screen real.

### Pendiente / notas para el siguiente sprint

- La instalación real en iPhone solo se puede probar una vez desplegado en
  HTTPS (Sprint 8) — hasta entonces esto es "correcto sobre el papel" pero
  no verificado en un dispositivo real.
- Sprint 7 (pulido) puede añadir un aviso de "hay una versión nueva,
  recarga" si `autoUpdate` no es suficientemente transparente en la
  práctica; de momento lo dejo silencioso (se actualiza solo en el
  siguiente `load`).

---

## Sprint 7 — Pulido de frontend (UX/UI) ✅

### Qué se hizo

- **Code-splitting de rutas** (`src/App.tsx`): `CalendarPage` e `History`
  (las que cargan Recharts y `react-day-picker`, lo más pesado del bundle)
  pasan a `React.lazy` + `Suspense`. El chunk principal baja de ~965KB a
  ~629KB; `CalendarPage` queda en su propio chunk de 75KB e `History` en
  388KB (Recharts), y solo se descargan si el usuario visita esas pestañas.
  Sigue habiendo un aviso de Vite por el chunk principal (~629KB,
  React+Router+Supabase+Framer Motion) — lo dejo así por ahora, ver
  "Pendiente" más abajo.
- **`framer-motion`** (estaba en el stack del README pero nunca se había
  instalado): entrada/salida animada de las tarjetas de `FoodEntryCard`
  (`AnimatePresence` + `layout` en `Today`/`CalendarPage`), transición
  cruzada entre el bloque de botones de feedback y el texto ya dado, y un
  fundido sutil al cambiar de pestaña (Hoy/Calendario/Histórico) en
  `Layout.tsx`.
- **Mensajes de error**: en `TextEntryForm`, `PhotoEntryForm` y `Login`
  pasaron de texto rojo plano a una tarjeta con fondo/borde (mismo patrón en
  los tres, con variante oscura), más visible sin cambiar el comportamiento.
- **`ErrorBoundary`** (`src/components/ErrorBoundary.tsx`), envolviendo
  `<App />` en `main.tsx`: si algo revienta en render, la app muestra una
  pantalla de "algo ha ido mal" con botón de recargar en vez de quedarse en
  blanco — relevante justo antes de desplegar a producción en el Sprint 8.

### Decisiones de diseño y por qué

- **Solo `CalendarPage`/`History` en `lazy`, no `Today`**: `Today` es la
  ruta de aterrizaje (`/`); retrasar su descarga con un `Suspense` habría
  añadido un salto de carga a la pantalla que se ve nada más entrar, sin
  beneficio real (ya se descarga siempre igualmente).
- **No perseguí el aviso de chunk >500KB hasta el final**: dividir
  React/React Router/Supabase/Framer Motion en más chunks (`manualChunks`)
  añade complejidad de configuración para un ahorro marginal en una app de
  un único usuario que ya se instala como PWA (con el shell cacheado, la
  carga inicial solo pasa una vez de verdad). Lo dejo documentado como
  pendiente en vez de sobre-optimizar sin necesidad real.
- **Framer Motion en las tarjetas y no en formularios/transiciones más
  vistosas**: es donde más se nota (la lista cambia con cada registro
  nuevo, incluido en tiempo real desde Realtime) y donde un fundido/desliz
  suave aporta más que un simple `opacity` en CSS.
- **`ErrorBoundary` de clase, no hook**: React todavía no tiene un hook
  oficial para `componentDidCatch`/`getDerivedStateFromError`; una clase es
  la única forma soportada de implementar un error boundary real.
- **Verificación**: build, lint y `tsc --noEmit` limpios. Arranqué el
  servidor de desarrollo y confirmé en el navegador (Browser pane) que
  `Login` renderiza sin errores de consola ni de servidor tras todos estos
  cambios (código/CSS válido, sin romper nada). **No pude ver las
  animaciones ni el resto de vistas autenticadas** por lo mismo de siempre:
  requiere sesión real vía magic link.

### Pendiente / notas para el siguiente sprint

- Si en el futuro el bundle principal (~629KB) se convierte en un problema
  real de rendimiento percibido, dividir manualmente
  `@supabase/supabase-js` y `framer-motion` en chunks separados sería el
  siguiente paso.
- Sprint 8 (deploy) es donde por fin se podrá probar todo esto (PWA,
  animaciones, flujo completo) en un dispositivo real.

---

## Sprint 8 — Deploy y CI/CD ✅

### Qué se hizo

- **`.github/workflows/ci.yml`**: en cada push a `main` y cada PR, corre
  `format:check`, `lint` y `build` (que incluye `tsc -b`, así que cubre el
  chequeo de tipos también). No necesita ningún secret: es una SPA y el
  build no ejecuta el código que lee las variables de Supabase, solo lo
  empaqueta (lo comprobé quitando `.env` a propósito y confirmando que
  `npm run build` sigue funcionando).
- **`npm run format` sobre todo el repo**: al añadir `format:check` a CI me
  encontré con que ya fallaba en 13 ficheros preexistentes (nunca se había
  exigido en un pipeline). Los reformateé todos con Prettier antes de dar
  por bueno el workflow — si no, la primera vez que corriera CI habría
  fallado por algo sin relación con este sprint. Son cambios de estilo
  únicamente, ninguna lógica tocada en los ficheros que no había editado ya
  por otro motivo.
- **`.github/workflows/deploy.yml`**: en cada push a `main`, construye la
  app con `VITE_BASE_PATH=/kalo/` (GitHub Pages sirve el proyecto bajo
  `/kalo/`, no en la raíz del dominio) y las dos variables públicas de
  Supabase desde repo secrets, y despliega `dist/` a GitHub Pages con las
  acciones oficiales (`configure-pages`, `upload-pages-artifact`,
  `deploy-pages`).
- **`vite.config.ts` y `index.html` ahora son conscientes del `base`**: sin
  esto, desplegar bajo `/kalo/` en vez de la raíz rompía todo (iconos y
  manifest apuntando a `/icons/...` en vez de `/kalo/icons/...`,
  `start_url`/`scope` del manifest mal calculados). Lo verifiqué compilando
  dos veces en local, con y sin `VITE_BASE_PATH=/kalo/`, y comprobando a
  mano el `manifest.webmanifest` y los `href`/`src` del `index.html`
  generados en cada caso.
- **`App.tsx`**: `<BrowserRouter basename={import.meta.env.BASE_URL}>` para
  que las rutas de React Router funcionen bajo la subruta.
- **Corregido un bug que habría roto el login en producción**:
  `useAuth.tsx` construía el `emailRedirectTo` del magic link con
  `window.location.origin`, que en GitHub Pages **no incluye la subruta**
  (`https://mango77x.github.io`, sin `/kalo`) — el enlace mágico habría
  llevado a un 404. Ahora es
  `window.location.origin + import.meta.env.BASE_URL`.

### Decisiones de diseño y por qué

- **GitHub Pages y no Vercel/Netlify/Cloudflare Pages**: cualquiera de esos
  habría necesitado que crearas/conectaras una cuenta externa (o me dieras
  un token de API de esa plataforma) — no es algo que pueda hacer por mi
  cuenta ni algo que deba pedirte a la ligera. GitHub Pages, en cambio, usa
  el mismo repo y el `GITHUB_TOKEN` que ya existe automáticamente en cada
  Actions run: cero cuentas nuevas.
- **`VITE_BASE_PATH` como variable de entorno propia, no hardcodeada en
  `vite.config.ts`**: así el build local (`npm run build`, sin la
  variable) sigue sirviendo en la raíz `/` sin cambios, y solo el workflow
  de deploy pasa `/kalo/`. Si en algún momento montas esto en un dominio
  propio en vez de GitHub Pages, basta con no pasar la variable.
- **Comprobé el bug de `emailRedirectTo` porque estaba tocando esa misma
  zona de "URL absoluta bajo subruta"**: no habría saltado en local (ahí
  `BASE_URL` es `/`, así que el bug es invisible) — solo se ve el problema
  en la config real bajo GitHub Pages. Vale la pena documentarlo porque si
  en el futuro cambias de subruta a dominio propio, hay que revisar que
  `BASE_URL` siga calculándose bien.
- **No toqué la configuración de Auth de Supabase (`uri_allow_list`)**: iba
  a añadir la URL de GitHub Pages y la de desarrollo local a la lista de
  redirects permitidos del proyecto (ahora mismo está vacía, con
  `site_url` todavía en el valor por defecto `http://localhost:3000`) para
  que el magic link funcione contra la URL real desplegada, pero el propio
  entorno bloqueó la llamada a la Management API por tratarse de un cambio
  de configuración de seguridad en un proyecto de producción que no me
  pediste nombrando explícitamente esta acción. Queda como pendiente tuyo
  (ver abajo) — con razón, es una decisión que te corresponde a ti.

### Los 3 pasos manuales — completados

Los hiciste tú (y en el caso de las redirect URLs, lo hice yo con tu
confirmación explícita después):

1. **Secrets del repo** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) —
   añadidos en Settings → Secrets and variables → Actions.
2. **GitHub Pages activado** (Settings → Pages → Source: "GitHub Actions").
3. **Redirect URLs de Supabase Auth** — configuradas vía API de gestión
   (con tu confirmación explícita): `site_url` a
   `https://mango77x.github.io/kalo/` y `uri_allow_list` con esa URL +
   `http://localhost:5173/**`.

Cualquier push a `main` despliega solo. URL final:
**https://mango77x.github.io/kalo/**.

### Bugs de producción encontrados y arreglados después del primer deploy

Ninguno de estos aparecía en local — solo se veían con la app realmente
desplegada, así que los fui encontrando y arreglando uno a uno según los
reportabas:

- **Deploy fallaba** (`configure-pages` action): GitHub Pages nunca se había
  activado (confirmado con `GET /repos/.../pages` → 404). Lo activaste tú.
- **Sitio en blanco**: los secrets del repo no estaban aún, así que el build
  horneó `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` vacíos y la app
  lanzaba su propio error de "faltan credenciales" al cargar. Confirmé
  descargando el bundle publicado y comprobando que la URL real de Supabase
  no estaba dentro.
- **Service Worker sirviendo la versión rota en caché**: al arreglar los
  secrets, mi propio navegador de pruebas seguía viendo la versión vieja
  porque el Service Worker (PWA) ya había cacheado el app shell roto en la
  primera visita. Hubo que desregistrarlo y limpiar caches a mano para ver
  el fix.
- **Magic link redirigía a `localhost:3000`**: `site_url` de Supabase Auth
  seguía en el valor por defecto de un proyecto nuevo, sin relación con nada
  que hubiéramos tocado nosotros.
- **Login en el email de prueba mostraba `{}` en rojo**: no era un problema
  de redirect sino que `signInWithOtp`/`signUp` fallaban al enviar el email
  (rate limit de 2/hora del SMTP por defecto de Supabase, agotado de tanto
  probar). Solución definitiva: SMTP propio con Resend (gratis, sin límite),
  que configuraste tú en el dashboard.
- **`{}` seguía saliendo después de eso, específico de instalar la PWA en
  iPhone y abrir el enlace desde la app de Mail**: el SDK usa PKCE por
  defecto, que exige abrir el enlace en el mismo navegador/contexto que
  pidió el login — la app de Mail en iOS abre los enlaces en un contexto
  distinto (sin acceso al `code_verifier` guardado). Arreglado forzando
  `flowType: 'implicit'` en `src/lib/supabase.ts`, que no depende de ese
  storage compartido.

### Pendiente / notas

- Con el deploy y el login ya verificados en real, el siguiente paso lógico
  es probar formalmente la instalación como PWA en un iPhone (Sprint 6 ya
  implementado, pero conviene confirmarlo con el dominio real desplegado en
  vez de local).

---

## Post-lanzamiento — rediseño visual, BYOK cifrado y login con Google ✅

Con la app ya en producción, esta tanda de trabajo respondió a feedback de
uso real en vez de seguir el plan de sprints al pie de la letra.

### Rediseño visual (dirección "Opción B")

Te enseñé dos mockups (minimal vs. visual con anillo de progreso) con la
skill de dataviz del proyecto; elegiste la segunda:

- `CalorieRing` (anillo SVG, meta diaria de referencia fija en 2000 kcal —
  no hay pantalla de ajustes de objetivo, es un valor simple) +
  `MacroChips` (proteína/carbos/grasa en tarjetas de color), reutilizados en
  Hoy y Calendario.
- **`EntryModal`**: sustituye los formularios de texto/foto que estaban
  siempre visibles por un botón "Registrar comida" que abre un modal grande
  con fondo difuminado. Paso 1: elegir Texto o Foto (con iconos). Texto:
  formulario con flecha para volver atrás. Foto: abre la cámara nativa
  directamente y, tras elegir/hacer la foto, muestra un preview con botón
  "Registrar" (antes se subía automáticamente al elegir el archivo).
  `TextEntryForm.tsx`/`PhotoEntryForm.tsx` quedaron eliminados, su lógica
  vive ahora dentro del modal.

### API key por usuario (BYOK), cifrada, y prompt caching

Surgió de dos preguntas tuyas: "si comparto la app, ¿pueden gastarme la API
de Claude?" y "¿está optimizado el consumo de tokens?".

- **Nueva tabla `user_settings`** (RLS: cada usuario solo ve/edita la suya).
  Cada usuario mete su propia API key de Anthropic en Ajustes (⚙️ en el
  header) — sin key propia, no puede usar el registro por texto/foto. Así un
  registro público nunca consume la cuota de otra persona.
- **Cifrado en reposo de verdad**: al principio iba a guardar la key tal
  cual y poner un aviso de "está cifrada" — me paraste con razón a
  comprobarlo antes de afirmarlo. Implementé AES-256-GCM
  (`supabase/functions/_shared/crypto.ts`, Web Crypto nativo de Deno, sin
  dependencias) con la clave de cifrado como secret de Supabase
  (`SETTINGS_ENCRYPTION_KEY`, 256 bits aleatorios, nunca en el repo). Nueva
  Edge Function `save-api-key` que cifra antes de guardar — el frontend
  nunca escribe la key en texto plano en la base de datos. El disclaimer del
  modal ("🔒 se cifra con AES-256...") se escribió después de tenerlo
  funcionando, no antes.
- **Prompt caching** en `_shared/anthropic.ts` (`cache_control: ephemeral`
  en el system prompt y el esquema de la herramienta): ambos apenas cambian
  entre llamadas, así que Anthropic no los reprocesa como tokens nuevos en
  cada registro — ahorro real de coste/latencia, no cosmético.

### Login con Google

Motivo: vas a compartir la app con varias personas y el magic link por
email era un incordio incluso con SMTP propio. Implementado
`signInWithOAuth({ provider: 'google' })` en `useAuth.tsx` + botón en
`Login.tsx`. Tú creaste las credenciales OAuth en Google Cloud Console
(gratis, sin necesidad de verificación de Google al usar solo scopes
básicos — publicado en modo Producción, no "Testing", para que cualquiera
pueda entrar sin límite de 100 usuarios de prueba ni caducidad de 7 días).
Configuré el provider en Supabase con el Client ID/Secret que me pasaste
(vía un fichero temporal, nunca en texto plano en un comando o commit) y
verifiqué que `/auth/v1/authorize?provider=google` redirige correctamente a
Google con los parámetros esperados.

### Decisiones y por qué

- **BYOK en vez de desactivar el registro público**: al principio propuse
  simplemente cerrar el signup (`disable_signup`) para el caso de un solo
  usuario. Cuando dijiste que ibas a compartir la app con más gente, BYOK
  resultó ser la solución correcta para ambos problemas a la vez (coste
  compartido Y multi-usuario), así que no hizo falta cerrar el registro.
- **Meta de calorías fija (2000 kcal) en `CalorieRing`**: el brief no pide
  un sistema de objetivos personalizables; añadir una pantalla de ajustes
  para eso habría sido alcance no pedido. Si en algún momento se quiere
  personalizar, es un cambio pequeño y localizado.
- **Verificación**: cada pieza de esta tanda se probó con datos reales o con
  llamadas directas a las APIs (no solo build/lint) — el bundle publicado
  para los secrets, el endpoint de `/authorize` para Google, `curl` directo
  a Anthropic para diagnosticar el crédito agotado, etc. Se documenta cada
  vez porque son los pasos que permitirían a otra sesión reproducir el
  diagnóstico sin adivinar.

### Pendiente

- Nada bloqueante. Sprint 6 (PWA) está implementado pero pendiente de una
  prueba formal de instalación en un iPhone real contra la URL de
  producción (ver nota del Sprint 8 arriba).
- Si en el futuro se comparte con mucha más gente, revisar si el modo
  "Producción" de Google sigue sin pedir verificación (cambia si se piden
  scopes sensibles o un volumen muy alto de usuarios).

---

## Post-lanzamiento (2) — bugs reales tras varias horas de uso con usuarios ✅

Reportados tras compartir la app con varias personas durante un par de
horas. Los dos eran reales, no percepción — verificados y arreglados con
evidencia, no solo "debería estar arreglado".

### Bug 1: la cámara no se abría en móvil (se quedaba en "Abriendo cámara…")

Causa: en `EntryModal.tsx`, el `<input type="file">` solo se montaba dentro
del paso `'photo'`, pero `handlePhotoButtonClick` llamaba a
`fileInputRef.current.click()` en la misma función que cambia `step` a
`'photo'` — antes de que React re-renderizara con el input ya montado, así
que el ref seguía siendo `null` y el `.click()` no hacía nada. Se quedaba
colgado para siempre en el mensaje de "Abriendo cámara…".

**Fix**: el `<input>` ahora se monta siempre (oculto), fuera del
condicional del paso — el ref existe desde el principio.

### Bug 2: estimaciones de texto poco fiables (evidencia: filas reales de `food_entries`)

Dos problemas distintos en la misma tabla de ejemplo que mandaste:

1. **Inconsistencia con platos compuestos**: "una tortilla de dos huevos y
   una yema" se guardó una vez como un solo plato y otra vez partido en dos
   filas ("tortilla de dos huevos" + "yema de huevo"), con el mismo texto de
   entrada. El prompt solo daba un ejemplo de plato compuesto con "con"
   ("tostada con aguacate"), no cubría el patrón "de ... y" para ingredientes
   dentro de una misma descripción. Reescribí la regla 1 del prompt con más
   ejemplos y un criterio más explícito. **Verificado** repitiendo la llamada
   real a Claude con el texto exacto reportado: ahora sale siempre como un
   único item.
2. **Productos envasados de marca, muy inexactos**: "Monster ENERGY Ultra
   500 ml blanco" se estimó en 105 kcal / 4g carbohidratos; el dato real de
   Open Food Facts es ~10 kcal / 4.5g carbos para todo el bote — un ~90% de
   error. Claude no puede "saber" la composición exacta de un producto de
   marca concreto, solo adivinar a partir de productos similares que conoce.
   **Implementado el cruce con Open Food Facts** que el brief preveía desde
   el principio (punto 2 del documento original) y que habíamos dejado
   pendiente en los Sprints 2/3 documentado como simplificación temporal:
   - Nuevos campos en `FOOD_ITEMS_TOOL`: `is_packaged_product` (boolean),
     `product_search_name` (nombre de búsqueda limpio, ej. "Monster Energy
     Ultra").
   - Nuevo `supabase/functions/_shared/open-food-facts.ts`: busca el
     producto real en Open Food Facts y, si lo encuentra, sustituye la
     estimación de Claude por los nutrientes reales (escalados a los gramos
     estimados), marcando `nutrition_source='open_food_facts'`. Si no lo
     encuentra, se queda con la estimación de Claude como respaldo
     (`ai_estimate`) — nunca rompe el registro por esto.
   - **Verificado con la API real** de Open Food Facts (`curl` directo:
     confirmé que "Monster Energy Ultra" devuelve 2 kcal/100g, coincide con
     el problema reportado) y repitiendo la llamada a Claude con el prompt
     nuevo para confirmar que marca `is_packaged_product=true` con el nombre
     de búsqueda correcto.

### Decisiones y por qué

- **No creé una tabla ni caché para resultados de Open Food Facts**: su API
  es gratuita y sin límite de uso razonable (ya documentado desde el
  principio del proyecto); cachear habría sido optimización prematura sin
  evidencia de que haga falta.
- **Rango de calorías más ajustado para productos de Open Food Facts
  (±10%)** que para estimación pura de IA (±15-30% según texto/foto): al
  ser un dato real de producto, la incertidumbre que queda es solo sobre los
  gramos exactos consumidos, no sobre la composición nutricional.
- **Verificación real en ambos bugs**, no solo build/lint: reproduje la
  llamada exacta a Claude con el prompt nuevo (mismo texto que reportaste) y
  golpeé la API de Open Food Facts directamente antes de dar el fix por
  bueno — así se confirma con evidencia, no solo "el código parece
  correcto".

### Pendiente

- Nada bloqueante. Si en el futuro se ven más inexactitudes con productos
  envasados, revisar si `product_search_name` necesita instrucciones más
  específicas (ej. incluir el tamaño del envase cuando afecte al resultado
  de búsqueda).

---

## Post-lanzamiento (3) — investigación de Fitia: USDA + formato de lista ✅

El usuario pidió investigar cómo Fitia (otra app de nutrición) logra
estimaciones más precisas mediante un formato de "lista de la compra" para
el registro por texto, y proponer cómo aplicarlo a Kalo. Se hizo la
investigación primero (con fuentes), se presentó un análisis, y tras la
confirmación del usuario se implementaron las dos piezas identificadas, en
commits separados como pidió.

### Investigación (resumen; ver la conversación para el detalle con fuentes)

Fitia tiene un "Registro Inteligente": el usuario escribe una lista (un
alimento por línea) en vez de una frase. Su propia documentación afirma que
esto mejora la precisión, pero el hallazgo importante fue otro: **el
formato de lista no es la razón principal** — Fitia combina la IA con una
**base de datos de alimentos verificada profesionalmente** (revisada por
nutricionistas, cruzada con USDA), así que el número final no sale de que
el modelo "calcule mejor", sino de que cada alimento parseado se busca en
datos reales en vez de estimarse de memoria. El formato de lista ayuda,
pero es secundario a tener una base de datos real detrás.

### Qué se implementó

**Pieza 1 — USDA FoodData Central** (`6fef591`): para alimentos
frescos/genéricos sin marca (pollo, arroz, huevo, fruta...), antes de
aceptar la estimación de Claude se intenta buscar el valor real en USDA.
Es la pieza del brief original que quedaba pendiente desde el Sprint 2
(Open Food Facts ya cubría productos envasados; USDA cubre el resto).
- `_shared/usda.ts` + `_shared/nutrition-resolution.ts` unifican Open Food
  Facts y USDA en una sola estrategia de 3 niveles (envasado→OFF,
  genérico→USDA, fallback→estimación IA).
- Nota técnica real encontrada al implementar: el nombre del nutriente de
  energía en USDA cambia según el dataset (`Energy` en SR Legacy vs.
  `Energy (Atwater ... Factors)` en Foundation), y algunos resultados
  (productos procesados) vienen con el panel de macros incompleto — hay que
  aceptar varios nombres y recorrer los primeros resultados hasta encontrar
  uno completo.
- **Usa la `DEMO_KEY` pública de USDA por ahora** (límite bajo, 30
  peticiones/hora, compartido globalmente entre todo el mundo que use esa
  key — se agotó solo con las pruebas de verificación). El código ya lee
  un secret `USDA_API_KEY` si existe, así que subir a una key propia
  (gratis e instantánea en fdc.nal.usda.gov/api-key-signup.html) es solo
  configurar el secret, sin tocar código.

**Pieza 2 — formato de lista en la UI** (`f206ac8`): el textarea de texto
libre ahora sugiere (placeholder + nota corta) escribir un alimento por
línea, y el prompt trata cada línea no vacía como un alimento distinto por
defecto. Esto elimina de raíz la ambigüedad que causó el bug de la tortilla
(Post-lanzamiento 2): si el usuario ya separa por líneas, no hay nada que
el modelo tenga que inferir sobre dónde empieza y acaba cada alimento.
Sigue aceptando una frase en una sola línea para quien lo prefiera.

### Decisiones y por qué

- **No se obligó el formato de lista** (no se eliminó la opción de frase
  libre): es una sugerencia con placeholder, no una validación estricta —
  menos fricción para quien prefiera escribir de forma conversacional,
  coherente con "no añadir restricciones no pedidas".
- **`usda_search_term_en` en inglés, no en español**: USDA FoodData Central
  no tiene datos en español; pedirle a Claude que traduzca el término de
  búsqueda es más fiable que intentar buscar directamente en español.
- **No se sustituye `food_name` por la descripción de USDA** (a diferencia
  de Open Food Facts, donde sí se sustituye por el nombre oficial del
  producto): la descripción de USDA está en inglés y es más técnica (ej.
  "Chicken, breast, boneless, skinless, raw"); el usuario prefiere ver el
  nombre en español que él mismo escribió. Solo se toman los números.
- **Verificación real en ambas piezas**: llamadas directas a la API de
  Claude con el prompt nuevo (confirmando `is_generic_food`/
  `usda_search_term_en` correctos, y que el formato de lista produce
  exactamente un item por línea) y a la API real de USDA (confirmando
  valores correctos para pollo a la plancha, y descubriendo el límite de
  `DEMO_KEY` de primera mano).

### Pendiente

- ~~Recomendado pero no bloqueante: pedir una API key propia de USDA~~ —
  **hecho**. El usuario la consiguió (gratis, instantánea) y se configuró
  como secret `USDA_API_KEY` en Supabase. El código ya la prioriza sobre la
  `DEMO_KEY` compartida sin ningún cambio de código (solo el secret) — el
  cruce con USDA debería ser fiable ahora en vez de agotarse con el límite
  de 30/hora compartido globalmente.

---

## Post-lanzamiento (4) — borrar registros y quitar calibración ✅

### Borrar entradas

Botón de papelera en `FoodEntryCard` (Hoy y Calendario, mismo componente).
El backend ya estaba listo desde el esquema inicial del proyecto — no hizo
falta ninguna migración:
- RLS ya tenía la política `food_entries: delete propias`.
- `calibration_feedback.food_entry_id` ya tenía `on delete cascade`.
- El trigger de `daily_summaries` ya manejaba el evento `DELETE` (recalcula
  el resumen del día al borrar).
- La suscripción Realtime (`useEntriesForDate`) ya escuchaba eventos
  `DELETE` y quitaba la fila del estado local — no hizo falta lógica nueva
  de UI aparte del propio botón + `confirm()` antes de borrar.

### Quitar la UI de calibración (Sprint 5)

El usuario señaló, con razón, que pedirle al usuario feedback tipo
"¿la ración era menos/bien/más de lo estimado?" no tiene sentido si nunca
pesa la comida — no tiene forma real de juzgarlo. Se quitó:
- El bloque de botones "¿La ración era...?" de `FoodEntryCard`.
- La carga/guardado de `calibration_feedback` en `useEntriesForDate`.
- La aplicación del multiplicador de `calibration_factors` en
  `buildEntryRows` y en ambas Edge Functions — importante quitarlo también
  aquí, no solo la UI: si no, cualquier multiplicador ya acumulado durante
  las pruebas (Sprint 5, un par de horas de uso real) seguiría ajustando
  en silencio las estimaciones nuevas sin que nadie pudiera ya corregirlo
  ni saber que estaba pasando.

**No se borraron las tablas `calibration_factors`/`calibration_feedback`**
de la base de datos — solo se dejaron de usar. Eliminar tablas es una
acción más destructiva y no es lo que se pidió; quedan ahí sin uso, sin
riesgo, por si en el futuro se quiere retomar la idea de otra forma (por
ejemplo, un ajuste manual explícito en vez de un multiplicador automático
silencioso).

### Pendiente

- Nada bloqueante. Si en algún momento se quiere limpiar del todo, sería
  una migración aparte para hacer `drop table` de las dos tablas — no se
  hizo por precaución (acción destructiva no pedida explícitamente).

---

## Post-lanzamiento (5) — coste de tokens: quitar caching, texto a Haiku ✅

El usuario reportó gastar ~5 céntimos de dólar en solo 5-6 registros de
texto y preguntó por qué. Se diagnosticó con datos reales (llamadas de
prueba a la API de Anthropic, inspeccionando el campo `usage` de la
respuesta) en vez de suponer.

### Hallazgo 1 — el prompt caching que añadimos estaba siendo contraproducente

El caché ephemeral de Anthropic dura 5 minutos. El patrón de uso real de
esta app es registros espaciados por horas (desayuno, comida, cena), no
varios por minuto. Con dos llamadas de prueba separadas por más de 5
minutos se confirmó: **cada llamada pagaba el precio de "crear caché"
(1.25x el precio normal de esos tokens) y nunca el de "leer caché" (0.1x,
mucho más barato)** — es decir, el caching hacía que se pagara *más* que
si no existiera. Se quitó el `cache_control` de `_shared/anthropic.ts`.
Lección: una optimización de coste "de manual" (prompt caching) puede ser
negativa si no encaja con el patrón de uso real — hay que medir, no asumir.

### Hallazgo 2 — el texto se procesaba con Sonnet sin necesitarlo

Medido (no estimado): el system prompt + el esquema de la herramienta pesan
**2336 tokens** en cada llamada. Se estaban procesando con Sonnet para una
tarea que es, en el fondo, extracción/clasificación de texto — no
estimación visual de porciones. El brief solo pide Sonnet para **fotos**
(por la diferencia de precisión documentada, R² 0.60 vs 0.23); nunca dijo
que el texto tuviera que compartir modelo.

**Cambiado `log-text-entry` a Claude Haiku 4.5**, sustancialmente más
barato por token que Sonnet. Verificado repitiendo los mismos 3 casos de
prueba usados para validar los fixes anteriores (tortilla, Monster Energy,
pollo+arroz): resultados idénticos en calidad, incluida la detección
correcta de `is_packaged_product`/`is_generic_food` y los términos de
búsqueda para Open Food Facts/USDA.

`log-photo-entry` sigue en Sonnet, sin cambios — ahí sí importa la
precisión visual según el brief, y las fotos ya son inherentemente más
caras por los tokens de imagen (inevitable si se quiere mantener esa
precisión).

### Decisiones y por qué

- **No se intentó cachear con TTL de 1 hora en vez de quitarlo del todo**:
  aunque existe esa opción, con el patrón de uso real (unos pocos registros
  al día, horas de diferencia) tampoco tendría muchos aciertos — más
  simple y más barato quitarlo directamente que mantener complejidad para
  un beneficio marginal.
- **Solo se cambió el modelo de texto, no el de foto**: es la única
  diferenciación que el propio brief justifica explícitamente con datos
  (R² de precisión). Cambiar fotos a Haiku habría sido "optimizar" en
  contra de un requisito explícito de calidad del proyecto.
- **Verificación con datos reales, no suposiciones**: todo el diagnóstico
  se basó en llamadas reales a la API y su campo `usage`, no en estimar
  de memoria cuánto "debería" costar cada llamada.

### Pendiente

- Nada bloqueante. Si en el futuro el coste de fotos preocupa, la única
  palanca real sin perder precisión sería reducir aún más la resolución de
  compresión de imagen (actualmente 1280px), a costa de algo de detalle
  visual para la estimación.

---

## Post-lanzamiento (6) — vista de detalle al pulsar una entrada ✅

El usuario señaló que el nombre del alimento se trunca en la tarjeta de la
lista (necesario para que quepa en una línea) y con platos descritos con
detalle ("una tortilla de dos huevos con una yema extra y un poco de sal
marina...") ese texto queda cortado y no se puede leer.

### Qué se hizo

- **`FoodEntryDetailModal.tsx`**: modal (mismo lenguaje visual que
  `EntryModal`/`SettingsModal` — bottom sheet con blur de fondo) que
  muestra: nombre completo sin truncar, fecha y hora del registro,
  calorías con el rango completo, gramos estimados, macros (reutiliza
  `MacroChips`), fuente de los datos nutricionales, y el **texto original
  que escribió el usuario** (`raw_input`) cuando el registro fue por texto
  — útil para ver exactamente qué se interpretó, no solo el resultado.
- **`FoodEntryCard.tsx`**: toda la tarjeta es pulsable (abre el detalle);
  el botón de borrar sigue funcionando independientemente parando la
  propagación del clic (`stopPropagation`), para no abrir el detalle al
  borrar por accidente.

### Verificación

Probado en navegador con un caso de plato compuesto largo a propósito: la
tarjeta lo trunca correctamente (confirma el problema original), y al
pulsarla el modal muestra el nombre completo, la fecha formateada, y el
`raw_input` completo sin cortar. Confirmado también que el botón "Cerrar"
del modal funciona.

### Decisiones y por qué

- **No se creó una ruta/página aparte para el detalle**: un modal encaja
  mejor con el patrón ya establecido en la app (`EntryModal`,
  `SettingsModal`) y no rompe el flujo de navegación por pestañas.
- **Se muestra `raw_input` solo si existe**: las entradas por foto no
  tienen texto original que mostrar (raw_input es null), así que esa
  sección del modal se omite automáticamente en ese caso.
