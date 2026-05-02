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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          auth_user_id: string | null
          created_at: string
          disabled_at: string | null
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          password_hash: string | null
          role: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          disabled_at?: string | null
          email: string
          full_name: string
          id?: string
          last_login_at?: string | null
          password_hash?: string | null
          role?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          disabled_at?: string | null
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          password_hash?: string | null
          role?: string
        }
        Relationships: []
      }
      oem_subscribers: {
        Row: {
          contact_email: string
          contact_first_name: string
          contact_last_name: string
          contract_end: string
          contract_start: string
          created_at: string
          id: string
          is_active: boolean
          organization: string
          role: string
          stripe_customer_id: string | null
          tier: string
        }
        Insert: {
          contact_email: string
          contact_first_name: string
          contact_last_name: string
          contract_end: string
          contract_start: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization: string
          role: string
          stripe_customer_id?: string | null
          tier: string
        }
        Update: {
          contact_email?: string
          contact_first_name?: string
          contact_last_name?: string
          contract_end?: string
          contract_start?: string
          created_at?: string
          id?: string
          is_active?: boolean
          organization?: string
          role?: string
          stripe_customer_id?: string | null
          tier?: string
        }
        Relationships: []
      }
      operators: {
        Row: {
          admin_notified_at: string | null
          auth_user_id: string | null
          company_name: string
          created_at: string
          dot_number: string | null
          email: string
          first_name: string
          fleet_size: string
          id: string
          last_login_at: string | null
          last_name: string
          password_hash: string | null
          state: string
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notified_at?: string | null
          auth_user_id?: string | null
          company_name: string
          created_at?: string
          dot_number?: string | null
          email: string
          first_name: string
          fleet_size: string
          id?: string
          last_login_at?: string | null
          last_name: string
          password_hash?: string | null
          state: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notified_at?: string | null
          auth_user_id?: string | null
          company_name?: string
          created_at?: string
          dot_number?: string | null
          email?: string
          first_name?: string
          fleet_size?: string
          id?: string
          last_login_at?: string | null
          last_name?: string
          password_hash?: string | null
          state?: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          abbr: string
          aliases: string[]
          brand_color: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          merged_at: string | null
          merged_into_id: string | null
          name: string
          provider_type: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          abbr: string
          aliases?: string[]
          brand_color: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          merged_at?: string | null
          merged_into_id?: string | null
          name: string
          provider_type: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          abbr?: string
          aliases?: string[]
          brand_color?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          merged_at?: string | null
          merged_into_id?: string | null
          name?: string
          provider_type?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "public_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      report_downloads: {
        Row: {
          downloaded_at: string
          file_format: string
          id: string
          ip_address: unknown
          provider_id: string | null
          report_period: string
          report_type: string
          subscriber_id: string
          user_agent: string | null
        }
        Insert: {
          downloaded_at?: string
          file_format: string
          id?: string
          ip_address?: unknown
          provider_id?: string | null
          report_period: string
          report_type: string
          subscriber_id: string
          user_agent?: string | null
        }
        Update: {
          downloaded_at?: string
          file_format?: string
          id?: string
          ip_address?: unknown
          provider_id?: string | null
          report_period?: string
          report_type?: string
          subscriber_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_downloads_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_downloads_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "public_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_downloads_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "oem_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          category_scores: Json
          counts_in_aggregate: boolean
          created_at: string
          id: string
          is_public: boolean
          narratives: Json
          operator_id: string
          overall_score: number
          period: string
          provider_id: string
          updated_at: string
          would_recommend: boolean | null
        }
        Insert: {
          category_scores: Json
          counts_in_aggregate?: boolean
          created_at?: string
          id?: string
          is_public?: boolean
          narratives?: Json
          operator_id: string
          overall_score: number
          period: string
          provider_id: string
          updated_at?: string
          would_recommend?: boolean | null
        }
        Update: {
          category_scores?: Json
          counts_in_aggregate?: boolean
          created_at?: string
          id?: string
          is_public?: boolean
          narratives?: Json
          operator_id?: string
          overall_score?: number
          period?: string
          provider_id?: string
          updated_at?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "public_providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_providers: {
        Row: {
          abbr: string | null
          aggregate_overall_score: number | null
          aggregate_recommend_pct: number | null
          aggregate_review_count: number | null
          aliases: string[] | null
          brand_color: string | null
          created_at: string | null
          id: string | null
          name: string | null
          provider_type: string | null
          slug: string | null
          website: string | null
        }
        Insert: {
          abbr?: string | null
          aggregate_overall_score?: number | null
          aggregate_recommend_pct?: number | null
          aggregate_review_count?: number | null
          aliases?: string[] | null
          brand_color?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          provider_type?: string | null
          slug?: string | null
          website?: string | null
        }
        Update: {
          abbr?: string | null
          aggregate_overall_score?: number | null
          aggregate_recommend_pct?: number | null
          aggregate_review_count?: number | null
          aliases?: string[] | null
          brand_color?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          provider_type?: string | null
          slug?: string | null
          website?: string | null
        }
        Relationships: []
      }
      public_reviews: {
        Row: {
          category_scores: Json | null
          created_at: string | null
          id: string | null
          overall_score: number | null
          period: string | null
          provider_id: string | null
          would_recommend: boolean | null
        }
        Insert: {
          category_scores?: Json | null
          created_at?: string | null
          id?: string | null
          overall_score?: number | null
          period?: string | null
          provider_id?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          category_scores?: Json | null
          created_at?: string | null
          id?: string | null
          overall_score?: number | null
          period?: string | null
          provider_id?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "public_providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_review_editable: { Args: { p: string }; Returns: boolean }
      quarter_end: { Args: { p: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
