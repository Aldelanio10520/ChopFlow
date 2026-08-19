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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: boolean
          pix_city: string
          pix_key: string
          pix_name: string
        }
        Insert: {
          id?: boolean
          pix_city?: string
          pix_key?: string
          pix_name?: string
        }
        Update: {
          id?: boolean
          pix_city?: string
          pix_key?: string
          pix_name?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          document: string | null
          due_day: number
          email: string | null
          id: string
          monthly_fee: number
          name: string
          next_due_date: string
          phone: string | null
          status: Database["public"]["Enums"]["company_status"]
        }
        Insert: {
          created_at?: string
          document?: string | null
          due_day?: number
          email?: string | null
          id?: string
          monthly_fee?: number
          name: string
          next_due_date?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["company_status"]
        }
        Update: {
          created_at?: string
          document?: string | null
          due_day?: number
          email?: string | null
          id?: string
          monthly_fee?: number
          name?: string
          next_due_date?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["company_status"]
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          contact_name: string | null
          created_at: string
          district: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          contact_name?: string | null
          created_at?: string
          district?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          district?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipments: {
        Row: {
          brand: string | null
          company_id: string
          created_at: string
          customer_id: string
          extractor_type: string | null
          id: string
          model: string | null
          notes: string | null
          refrigerant: string | null
          serial_number: string | null
          taps: number | null
          type: string
          voltage: string | null
        }
        Insert: {
          brand?: string | null
          company_id: string
          created_at?: string
          customer_id: string
          extractor_type?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          refrigerant?: string | null
          serial_number?: string | null
          taps?: number | null
          type: string
          voltage?: string | null
        }
        Update: {
          brand?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string
          extractor_type?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          refrigerant?: string | null
          serial_number?: string | null
          taps?: number | null
          type?: string
          voltage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          unit: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          unit?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          due_date: string
          id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          company_id: string
          created_at: string
          id: string
          notes: string | null
          route_date: string
          technician_id: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          route_date?: string
          technician_id: string
          title?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          route_date?: string
          technician_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_technician_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["wo_kind"]
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["wo_kind"]
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["wo_kind"]
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      status_events: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          status: Database["public"]["Enums"]["wo_status"]
          work_order_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          status: Database["public"]["Enums"]["wo_status"]
          work_order_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["wo_status"]
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_order_parts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          part_id: string
          quantity: number
          work_order_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          part_id: string
          quantity?: number
          work_order_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          part_id?: string
          quantity?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          checkin_at: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          customer_id: string
          description: string | null
          duration_minutes: number | null
          equipment_id: string | null
          id: string
          kind: Database["public"]["Enums"]["wo_kind"]
          position: number
          received_at: string | null
          route_id: string | null
          scheduled_date: string
          service_id: string | null
          status: Database["public"]["Enums"]["wo_status"]
          technician_id: string | null
          technician_notes: string | null
          travel_started_at: string | null
        }
        Insert: {
          checkin_at?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          duration_minutes?: number | null
          equipment_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["wo_kind"]
          position?: number
          received_at?: string | null
          route_id?: string | null
          scheduled_date?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["wo_status"]
          technician_id?: string | null
          technician_notes?: string | null
          travel_started_at?: string | null
        }
        Update: {
          checkin_at?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          duration_minutes?: number | null
          equipment_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["wo_kind"]
          position?: number
          received_at?: string | null
          route_id?: string | null
          scheduled_date?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["wo_status"]
          technician_id?: string | null
          technician_notes?: string | null
          travel_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_technician_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: never; Returns: boolean }
      super_admin_exists: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "gestor" | "tecnico"
      company_status: "ativa" | "bloqueada"
      payment_status: "pendente" | "pago"
      wo_kind: "emergencial" | "preventiva" | "sanitizacao" | "instalacao"
      wo_status:
        | "pendente"
        | "recebido"
        | "em_deslocamento"
        | "em_atendimento"
        | "concluido"
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
      app_role: ["super_admin", "gestor", "tecnico"],
      company_status: ["ativa", "bloqueada"],
      payment_status: ["pendente", "pago"],
      wo_kind: ["emergencial", "preventiva", "sanitizacao", "instalacao"],
      wo_status: [
        "pendente",
        "recebido",
        "em_deslocamento",
        "em_atendimento",
        "concluido",
      ],
    },
  },
} as const
