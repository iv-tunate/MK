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
      admin_credentials: {
        Row: {
          created_at: string
          password_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          password_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          password_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          accent_hsl: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
        }
        Insert: {
          accent_hsl?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Update: {
          accent_hsl?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          category: string
          config: Json
          created_at: string
          duration: string | null
          id: string
          line_total_naira: number
          location: string | null
          order_id: string
          quantity: number
          schedule_mode: string | null
          service_date: string | null
          service_name: string
          service_schedule: Json
          unit_price_naira: number
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string
          duration?: string | null
          id?: string
          line_total_naira?: number
          location?: string | null
          order_id: string
          quantity: number
          schedule_mode?: string | null
          service_date?: string | null
          service_name: string
          service_schedule?: Json
          unit_price_naira?: number
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          duration?: string | null
          id?: string
          line_total_naira?: number
          location?: string | null
          order_id?: string
          quantity?: number
          schedule_mode?: string | null
          service_date?: string | null
          service_name?: string
          service_schedule?: Json
          unit_price_naira?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          cancellation_note: string | null
          cancellation_reasons: string[] | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          discount_amount: number | null
          discount_label: string | null
          id: string
          invoice_sent_at: string | null
          invoice_storage_path: string | null
          is_quote_request: boolean
          notes: string | null
          order_number: string
          receipt_sent_at: string | null
          receipt_storage_path: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_naira: number
          total_naira: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          cancellation_note?: string | null
          cancellation_reasons?: string[] | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_label?: string | null
          id?: string
          invoice_sent_at?: string | null
          invoice_storage_path?: string | null
          is_quote_request?: boolean
          notes?: string | null
          order_number: string
          receipt_sent_at?: string | null
          receipt_storage_path?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_naira?: number
          total_naira?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          cancellation_note?: string | null
          cancellation_reasons?: string[] | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_label?: string | null
          id?: string
          invoice_sent_at?: string | null
          invoice_storage_path?: string | null
          is_quote_request?: boolean
          notes?: string | null
          order_number?: string
          receipt_sent_at?: string | null
          receipt_storage_path?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_naira?: number
          total_naira?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_field_options: {
        Row: {
          created_at: string
          field_id: string
          id: string
          is_active: boolean
          label: string
          price_modifier_naira: number
          sort_order: number
          stock: number | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          is_active?: boolean
          label: string
          price_modifier_naira?: number
          sort_order?: number
          stock?: number | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          is_active?: boolean
          label?: string
          price_modifier_naira?: number
          sort_order?: number
          stock?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_field_options_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "service_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      service_fields: {
        Row: {
          created_at: string
          default_num: number | null
          field_key: string
          id: string
          info: string | null
          kind: Database["public"]["Enums"]["field_kind"]
          label: string
          max_num: number | null
          min_num: number | null
          options: string[] | null
          placeholder: string | null
          required: boolean
          service_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          default_num?: number | null
          field_key: string
          id?: string
          info?: string | null
          kind: Database["public"]["Enums"]["field_kind"]
          label: string
          max_num?: number | null
          min_num?: number | null
          options?: string[] | null
          placeholder?: string | null
          required?: boolean
          service_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          default_num?: number | null
          field_key?: string
          id?: string
          info?: string | null
          kind?: Database["public"]["Enums"]["field_kind"]
          label?: string
          max_num?: number | null
          min_num?: number | null
          options?: string[] | null
          placeholder?: string | null
          required?: boolean
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_fields_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_primary: boolean
          service_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          service_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          service_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_photos_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price_naira: number
          category_id: string
          created_at: string
          description: string
          icon: string
          id: string
          info: string
          is_active: boolean
          name: string
          price_per_day: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_price_naira?: number
          category_id: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          info?: string
          is_active?: boolean
          name: string
          price_per_day?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_price_naira?: number
          category_id?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          info?: string
          is_active?: boolean
          name?: string
          price_per_day?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      grant_admin_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_email: { Args: { _email: string }; Returns: boolean }
      list_admins: {
        Args: never
        Returns: {
          created_at: string
          email: string
          first_name: string
          has_password: boolean
          last_name: string
          user_id: string
        }[]
      }
      revoke_admin_by_user_id: {
        Args: { _user_id: string }
        Returns: undefined
      }
      set_admin_password: {
        Args: { _password: string; _user_id: string }
        Returns: undefined
      }
      verify_admin_password: {
        Args: { _email: string; _password: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      field_kind: "qty" | "text" | "select" | "checkbox" | "datetime"
      order_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "refunded"
      service_category: "guards" | "events" | "mascots"
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
      app_role: ["admin", "customer"],
      field_kind: ["qty", "text", "select", "checkbox", "datetime"],
      order_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "refunded",
      ],
      service_category: ["guards", "events", "mascots"],
    },
  },
} as const
