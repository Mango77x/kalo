# 🥗 Kalo

Calorie tracker personal (single-user). Registra comida "al vuelo" por **texto
libre** o **foto**, sin pesar nada. Estima nutrientes con Claude, cruza con
bases de datos nutricionales (Open Food Facts / USDA) y aprende de tu feedback
para corregir sus estimaciones por categoría de alimento.

## Stack

- **Frontend**: React 19 + Vite + TypeScript, Tailwind CSS v4, shadcn/ui,
  Framer Motion, Recharts. Instalable como **PWA** en iPhone.
- **Backend**: Supabase (Postgres + Auth magic link + Realtime + Edge Functions).
- **IA**: Claude Sonnet para análisis de imágenes y parsing de texto libre.
  La API key vive solo en una Edge Function, nunca en el frontend.

## Desarrollo

```bash
npm install
cp .env.example .env   # rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

Scripts: `dev`, `build`, `preview`, `lint`, `format`.

## Estado del proyecto

Ver [`PROGRESO.md`](./PROGRESO.md) para la bitácora sprint a sprint y las
credenciales necesarias en cada fase.
