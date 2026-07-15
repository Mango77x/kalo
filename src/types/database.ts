// Tipo `Database` para tipar el cliente de Supabase.
//
// Escrito a mano reflejando supabase/migrations/20260714110512_initial_schema.sql
// (el `gen types` automático requiere Docker, no disponible en este entorno).
// Si se instala Docker localmente, puede regenerarse con:
//   npx supabase gen types typescript --db-url <connection-string> > src/types/database.ts
export type Database = {
  public: {
    Tables: {
      food_categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          id: string
          user_id: string
          created_at: string
          consumed_at: string
          source: 'text' | 'photo' | 'barcode'
          raw_input: string | null
          food_name: string
          estimated_grams: number | null
          calories_min: number | null
          calories_max: number | null
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          category_id: string | null
          nutrition_source: 'open_food_facts' | 'usda' | 'ai_estimate'
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          consumed_at?: string
          source: 'text' | 'photo' | 'barcode'
          raw_input?: string | null
          food_name: string
          estimated_grams?: number | null
          calories_min?: number | null
          calories_max?: number | null
          calories: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          category_id?: string | null
          nutrition_source?: 'open_food_facts' | 'usda' | 'ai_estimate'
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          consumed_at?: string
          source?: 'text' | 'photo' | 'barcode'
          raw_input?: string | null
          food_name?: string
          estimated_grams?: number | null
          calories_min?: number | null
          calories_max?: number | null
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          category_id?: string | null
          nutrition_source?: 'open_food_facts' | 'usda' | 'ai_estimate'
        }
        Relationships: [
          {
            foreignKeyName: 'food_entries_category_id_fkey'
            columns: ['category_id']
            referencedRelation: 'food_categories'
            referencedColumns: ['id']
          },
        ]
      }
      calibration_factors: {
        Row: {
          id: string
          user_id: string
          category_id: string
          correction_multiplier: number
          sample_count: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          correction_multiplier?: number
          sample_count?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          correction_multiplier?: number
          sample_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calibration_factors_category_id_fkey'
            columns: ['category_id']
            referencedRelation: 'food_categories'
            referencedColumns: ['id']
          },
        ]
      }
      calibration_feedback: {
        Row: {
          id: string
          food_entry_id: string
          user_id: string
          feedback: 'less' | 'correct' | 'more'
          created_at: string
        }
        Insert: {
          id?: string
          food_entry_id: string
          user_id: string
          feedback: 'less' | 'correct' | 'more'
          created_at?: string
        }
        Update: {
          id?: string
          food_entry_id?: string
          user_id?: string
          feedback?: 'less' | 'correct' | 'more'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calibration_feedback_food_entry_id_fkey'
            columns: ['food_entry_id']
            referencedRelation: 'food_entries'
            referencedColumns: ['id']
          },
        ]
      }
      daily_summaries: {
        Row: {
          id: string
          user_id: string
          date: string
          total_calories: number
          total_protein_g: number
          total_carbs_g: number
          total_fat_g: number
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          total_calories?: number
          total_protein_g?: number
          total_carbs_g?: number
          total_fat_g?: number
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          total_calories?: number
          total_protein_g?: number
          total_carbs_g?: number
          total_fat_g?: number
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          user_id: string
          anthropic_api_key: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          anthropic_api_key?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          anthropic_api_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      recompute_daily_summary: {
        Args: { p_user_id: string; p_date: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
