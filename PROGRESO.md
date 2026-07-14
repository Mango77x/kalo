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
| 5      | Calibración personal         | ⬜ Pendiente  |
| 6      | PWA e instalación en iPhone  | ⬜ Pendiente  |
| 7      | Pulido de frontend (UX/UI)   | ⬜ Pendiente  |
| 8      | Deploy y CI/CD               | ⬜ Pendiente  |

Repo en GitHub: https://github.com/Mango77x/kalo (rama `main` al día,
`320c531`).

---

## 🔑 CREDENCIALES Y BLOQUEANTES

Todas las credenciales de infraestructura están recibidas y configuradas:
Project URL + anon (publishable) key de Supabase, contraseña de Postgres, API
key de Anthropic (secret de las Edge Functions, no vive en el frontend), y un
Personal Access Token de Supabase (uso puntual para CLI, guardado en
`.supabase_access_token`, gitignored).

**⚠️ Bloqueante activo: saldo de la cuenta de Anthropic agotado.** Al probar
el registro por texto/foto en real, la API de Claude devuelve *"Your credit
balance is too low to access the Anthropic API"*. Esto bloquea funcionalmente
los Sprints 2 y 3 (ya implementados y desplegados, pero no usables hasta
resolver esto). Necesitas añadir crédito/método de pago en
console.anthropic.com → Plans & Billing. No es algo que yo pueda gestionar
(pagos/facturación).

**Límite de emails de Supabase (rate_limit_email_sent)**: el proyecto tiene el
límite por defecto de 2 emails/hora para magic link, compartido y no
ampliable sin configurar SMTP propio (lo intenté vía API de gestión y
Supabase lo rechaza explícitamente sin custom SMTP). Ya conseguiste iniciar
sesión una vez — la sesión persiste (`persistSession: true`), así que no
debería volver a bloquear el acceso normal. Si en el futuro necesitas otro
magic link (otro dispositivo, sesión expirada) y te topas con el límite, solo
queda esperar a que resetee o configurar SMTP propio en el dashboard.

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
