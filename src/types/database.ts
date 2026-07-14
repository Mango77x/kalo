// Tipo `Database` para tipar el cliente de Supabase.
//
// En cuanto exista el proyecto de Supabase y su esquema, este fichero se
// regenerará automáticamente con:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
//
// De momento es un stub permisivo para que el cliente tipado compile en Sprint 0.
export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
