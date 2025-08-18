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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audio_settings: {
        Row: {
          created_at: string
          hold_music_url: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hold_music_url?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hold_music_url?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_history: {
        Row: {
          call_duration: number | null
          call_id: string | null
          call_state: string
          caller_extension: string | null
          commercial_id: string | null
          created_at: string
          ended_at: string | null
          extension: string
          id: string
          started_at: string
          target_number: string
        }
        Insert: {
          call_duration?: number | null
          call_id?: string | null
          call_state?: string
          caller_extension?: string | null
          commercial_id?: string | null
          created_at?: string
          ended_at?: string | null
          extension: string
          id?: string
          started_at?: string
          target_number: string
        }
        Update: {
          call_duration?: number | null
          call_id?: string | null
          call_state?: string
          caller_extension?: string | null
          commercial_id?: string | null
          created_at?: string
          ended_at?: string | null
          extension?: string
          id?: string
          started_at?: string
          target_number?: string
        }
        Relationships: []
      }
      commercials: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          language: string
          name: string
          sip_domain: string | null
          sip_password: string | null
          sip_port: number | null
          sip_server: string | null
          sip_username: string | null
          total_earnings: number | null
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          language?: string
          name: string
          sip_domain?: string | null
          sip_password?: string | null
          sip_port?: number | null
          sip_server?: string | null
          sip_username?: string | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          language?: string
          name?: string
          sip_domain?: string | null
          sip_password?: string | null
          sip_port?: number | null
          sip_server?: string | null
          sip_username?: string | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          bounce_at: string | null
          bounce_count: number | null
          bounce_reason: string | null
          commercial_id: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          open_count: number | null
          opened_at: string | null
          recipient_email: string
          recipient_name: string | null
          resend_id: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_id: string | null
          tracking_code: string
          user_id: string | null
        }
        Insert: {
          bounce_at?: string | null
          bounce_count?: number | null
          bounce_reason?: string | null
          commercial_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          tracking_code: string
          user_id?: string | null
        }
        Update: {
          bounce_at?: string | null
          bounce_count?: number | null
          bounce_reason?: string | null
          commercial_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          tracking_code?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_email_logs_commercial_id"
            columns: ["commercial_id"]
            isOneToOne: false
            referencedRelation: "commercials"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          subject: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          commercial_id: string
          created_at: string | null
          email: string
          first_name: string
          id: string
          name: string
          phone: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          commercial_id: string
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          name: string
          phone: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          commercial_id?: string
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          name?: string
          phone?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_commercial_id_fkey"
            columns: ["commercial_id"]
            isOneToOne: false
            referencedRelation: "commercials"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_contacts: {
        Row: {
          commercial_id: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          name: string
          phone: string
          source: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          commercial_id?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          name: string
          phone: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          commercial_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          name?: string
          phone?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_contacts_commercial_id_fkey"
            columns: ["commercial_id"]
            isOneToOne: false
            referencedRelation: "commercials"
            referencedColumns: ["id"]
          },
        ]
      }
      server_config: {
        Row: {
          created_at: string
          current_server_ip: unknown
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_server_ip: unknown
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_server_ip?: unknown
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sip_credentials: {
        Row: {
          created_at: string
          display_name: string | null
          extension: string
          id: string
          password: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          extension: string
          id?: string
          password: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          extension?: string
          id?: string
          password?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      user_leads: {
        Row: {
          api_key: string | null
          balance: number | null
          balance_error: string | null
          commercial_name: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          name: string | null
          secret_key: string | null
          status: string | null
          updated_at: string
          user_agent: string | null
          username: string
        }
        Insert: {
          api_key?: string | null
          balance?: number | null
          balance_error?: string | null
          commercial_name?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          name?: string | null
          secret_key?: string | null
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          username: string
        }
        Update: {
          api_key?: string | null
          balance?: number | null
          balance_error?: string | null
          commercial_name?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          name?: string | null
          secret_key?: string | null
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          commercial_id: string | null
          created_at: string | null
          detected_at: string | null
          id: string
          processed_at: string | null
          transaction_hash: string | null
          transaction_type: string
          wallet_id: string | null
        }
        Insert: {
          amount: number
          commercial_id?: string | null
          created_at?: string | null
          detected_at?: string | null
          id?: string
          processed_at?: string | null
          transaction_hash?: string | null
          transaction_type?: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          commercial_id?: string | null
          created_at?: string | null
          detected_at?: string | null
          id?: string
          processed_at?: string | null
          transaction_hash?: string | null
          transaction_type?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_commercial_id_fkey"
            columns: ["commercial_id"]
            isOneToOne: false
            referencedRelation: "commercials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          client_balance: number | null
          client_tracking_id: string | null
          created_at: string
          id: string
          is_used: boolean
          last_balance_check: string | null
          monitoring_active: boolean | null
          status: string | null
          updated_at: string
          used_at: string | null
          used_by_commercial_id: string | null
          wallet_phrase: string
        }
        Insert: {
          client_balance?: number | null
          client_tracking_id?: string | null
          created_at?: string
          id?: string
          is_used?: boolean
          last_balance_check?: string | null
          monitoring_active?: boolean | null
          status?: string | null
          updated_at?: string
          used_at?: string | null
          used_by_commercial_id?: string | null
          wallet_phrase: string
        }
        Update: {
          client_balance?: number | null
          client_tracking_id?: string | null
          created_at?: string
          id?: string
          is_used?: boolean
          last_balance_check?: string | null
          monitoring_active?: boolean | null
          status?: string | null
          updated_at?: string
          used_at?: string | null
          used_by_commercial_id?: string | null
          wallet_phrase?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_wallets_commercial"
            columns: ["used_by_commercial_id"]
            isOneToOne: false
            referencedRelation: "commercials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_available_sip_extensions: {
        Args: Record<PropertyKey, never>
        Returns: {
          display_name: string
          extension: string
          status: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "commercial"
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
    Enums: {
      app_role: ["super_admin", "admin", "commercial"],
    },
  },
} as const
