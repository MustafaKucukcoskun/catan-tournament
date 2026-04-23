export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_login_attempts: {
        Row: {
          attempted_at: string
          id: number
          ip_hash: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: number
          ip_hash: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: number
          ip_hash?: string
          success?: boolean
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_hint: string | null
          last_seen_at: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_hint?: string | null
          last_seen_at?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_hint?: string | null
          last_seen_at?: string
          token_hash?: string
        }
        Relationships: []
      }
      leaderboard_stats: {
        Row: {
          best_single_vp: number
          id: string
          matches_played: number
          player_id: string
          rank: number | null
          total_vp: number
          tournament_id: string
          updated_at: string
          vp_percent: number
          wins: number
        }
        Insert: {
          best_single_vp?: number
          id?: string
          matches_played?: number
          player_id: string
          rank?: number | null
          total_vp?: number
          tournament_id: string
          updated_at?: string
          vp_percent?: number
          wins?: number
        }
        Update: {
          best_single_vp?: number
          id?: string
          matches_played?: number
          player_id?: string
          rank?: number | null
          total_vp?: number
          tournament_id?: string
          updated_at?: string
          vp_percent?: number
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_stats_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      map_templates: {
        Row: {
          created_at: string
          data: Json
          id: string
          is_official: boolean
          name: string
          players: string
          source: string
          thumbnail_url: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          is_official?: boolean
          name: string
          players?: string
          source?: string
          thumbnail_url?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          is_official?: boolean
          name?: string
          players?: string
          source?: string
          thumbnail_url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      match_tables: {
        Row: {
          completed_at: string | null
          id: string
          map_data: Json | null
          map_seed: string | null
          map_template_id: string | null
          round_id: string
          seat_count: number
          started_at: string | null
          status: string
          table_number: number
        }
        Insert: {
          completed_at?: string | null
          id?: string
          map_data?: Json | null
          map_seed?: string | null
          map_template_id?: string | null
          round_id: string
          seat_count?: number
          started_at?: string | null
          status?: string
          table_number: number
        }
        Update: {
          completed_at?: string | null
          id?: string
          map_data?: Json | null
          map_seed?: string | null
          map_template_id?: string | null
          round_id?: string
          seat_count?: number
          started_at?: string | null
          status?: string
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_tables_map_template_id_fkey"
            columns: ["map_template_id"]
            isOneToOne: false
            referencedRelation: "map_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_tables_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          id: string
          name: string
          registered_at: string
          seat_code: string
          tournament_id: string
        }
        Insert: {
          id?: string
          name: string
          registered_at?: string
          seat_code: string
          tournament_id: string
        }
        Update: {
          id?: string
          name?: string
          registered_at?: string
          seat_code?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          round_number: number
          round_type: string
          started_at: string | null
          status: string
          tournament_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          round_number: number
          round_type: string
          started_at?: string | null
          status?: string
          tournament_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          round_number?: number
          round_type?: string
          started_at?: string | null
          status?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      table_players: {
        Row: {
          created_at: string
          final_vp: number | null
          id: string
          is_bye: boolean
          is_virtual: boolean
          is_winner: boolean
          match_table_id: string
          player_id: string
          seat_position: number | null
        }
        Insert: {
          created_at?: string
          final_vp?: number | null
          id?: string
          is_bye?: boolean
          is_virtual?: boolean
          is_winner?: boolean
          match_table_id: string
          player_id: string
          seat_position?: number | null
        }
        Update: {
          created_at?: string
          final_vp?: number | null
          id?: string
          is_bye?: boolean
          is_virtual?: boolean
          is_winner?: boolean
          match_table_id?: string
          player_id?: string
          seat_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "table_players_match_table_id_fkey"
            columns: ["match_table_id"]
            isOneToOne: false
            referencedRelation: "match_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          completed_at: string | null
          created_at: string
          current_round: number
          current_round_type: string | null
          elimination_count: number
          fairness_preset: string
          id: string
          league_rounds: number
          map_rules: Json
          map_strategy: Json
          name: string
          started_at: string | null
          status: string
          total_players: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_round?: number
          current_round_type?: string | null
          elimination_count: number
          fairness_preset?: string
          id?: string
          league_rounds?: number
          map_rules?: Json
          map_strategy?: Json
          name: string
          started_at?: string | null
          status?: string
          total_players: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_round?: number
          current_round_type?: string | null
          elimination_count?: number
          fairness_preset?: string
          id?: string
          league_rounds?: number
          map_rules?: Json
          map_strategy?: Json
          name?: string
          started_at?: string | null
          status?: string
          total_players?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
