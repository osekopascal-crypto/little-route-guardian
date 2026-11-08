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
      announcements: {
        Row: {
          audience: string
          author_id: string
          body: string
          created_at: string
          id: string
          school_id: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          author_id: string
          body: string
          created_at?: string
          id?: string
          school_id: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          school_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_positions: {
        Row: {
          bus_id: string | null
          heading: number | null
          id: string
          lat: number
          lng: number
          recorded_at: string
          school_id: string
          speed_kph: number | null
          trip_id: string
        }
        Insert: {
          bus_id?: string | null
          heading?: number | null
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          school_id: string
          speed_kph?: number | null
          trip_id: string
        }
        Update: {
          bus_id?: string | null
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          school_id?: string
          speed_kph?: number | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_positions_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_positions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_positions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          capacity: number
          created_at: string
          id: string
          label: string
          plate_no: string
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          label: string
          plate_no: string
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          label?: string
          plate_no?: string
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_invoices: {
        Row: {
          amount_kes: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          school_id: string
          status: string
          student_id: string
          term_label: string
          updated_at: string
        }
        Insert: {
          amount_kes: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          school_id: string
          status?: string
          student_id: string
          term_label: string
          updated_at?: string
        }
        Update: {
          amount_kes?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          school_id?: string
          status?: string
          student_id?: string
          term_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount_kes: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          paid_at: string
          recorded_by: string | null
          reference: string | null
          school_id: string
        }
        Insert: {
          amount_kes: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
          school_id: string
        }
        Update: {
          amount_kes?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_consents: {
        Row: {
          consent_given_at: string
          consent_version: string
          guardian_id: string
          id: string
          school_id: string
          user_agent: string | null
        }
        Insert: {
          consent_given_at?: string
          consent_version: string
          guardian_id: string
          id?: string
          school_id: string
          user_agent?: string | null
        }
        Update: {
          consent_given_at?: string
          consent_version?: string
          guardian_id?: string
          id?: string
          school_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_consents_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_consents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          bus_id: string | null
          created_at: string
          description: string
          id: string
          kind: string
          reported_by: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          school_id: string
          severity: string
          status: string
          student_id: string | null
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          bus_id?: string | null
          created_at?: string
          description: string
          id?: string
          kind: string
          reported_by: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          school_id: string
          severity?: string
          status?: string
          student_id?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          bus_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: string
          reported_by?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          school_id?: string
          severity?: string
          status?: string
          student_id?: string | null
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          recipient_id: string
          school_id: string
          student_id: string | null
          title: string
          trip_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          recipient_id: string
          school_id: string
          student_id?: string | null
          title: string
          trip_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          recipient_id?: string
          school_id?: string
          student_id?: string | null
          title?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: string
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          role: string
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          created_at: string
          dropoff_time: string | null
          id: string
          lat: number
          lng: number
          name: string
          pickup_time: string | null
          route_id: string
          school_id: string
          sequence: number
        }
        Insert: {
          created_at?: string
          dropoff_time?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          pickup_time?: string | null
          route_id: string
          school_id: string
          sequence: number
        }
        Update: {
          created_at?: string
          dropoff_time?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          pickup_time?: string | null
          route_id?: string
          school_id?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          code: string
          corridor: string | null
          created_at: string
          id: string
          name: string
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          corridor?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          corridor?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          code: string
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_guardians: {
        Row: {
          created_at: string
          guardian_id: string
          id: string
          is_primary: boolean
          relationship: string
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          guardian_id: string
          id?: string
          is_primary?: boolean
          relationship?: string
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          guardian_id?: string
          id?: string
          is_primary?: boolean
          relationship?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_no: string
          class_name: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string
          gender: string | null
          grade_level: string | null
          home_address: string | null
          id: string
          last_name: string
          pickup_notes: string | null
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admission_no: string
          class_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          gender?: string | null
          grade_level?: string | null
          home_address?: string | null
          id?: string
          last_name: string
          pickup_notes?: string | null
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admission_no?: string
          class_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          gender?: string | null
          grade_level?: string | null
          home_address?: string | null
          id?: string
          last_name?: string
          pickup_notes?: string | null
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_students: {
        Row: {
          boarded_at: string | null
          created_at: string
          dropped_at: string | null
          id: string
          school_id: string
          status: string
          stop_id: string | null
          student_id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          boarded_at?: string | null
          created_at?: string
          dropped_at?: string | null
          id?: string
          school_id: string
          status?: string
          stop_id?: string | null
          student_id: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          boarded_at?: string | null
          created_at?: string
          dropped_at?: string | null
          id?: string
          school_id?: string
          status?: string
          stop_id?: string | null
          student_id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_students_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_students_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          attendant_id: string | null
          bus_id: string | null
          created_at: string
          current_stop_id: string | null
          direction: string
          ended_at: string | null
          id: string
          route_id: string
          school_id: string
          started_at: string | null
          status: string
          trip_date: string
          updated_at: string
        }
        Insert: {
          attendant_id?: string | null
          bus_id?: string | null
          created_at?: string
          current_stop_id?: string | null
          direction?: string
          ended_at?: string | null
          id?: string
          route_id: string
          school_id: string
          started_at?: string | null
          status?: string
          trip_date?: string
          updated_at?: string
        }
        Update: {
          attendant_id?: string | null
          bus_id?: string | null
          created_at?: string
          current_stop_id?: string | null
          direction?: string
          ended_at?: string | null
          id?: string
          route_id?: string
          school_id?: string
          started_at?: string | null
          status?: string
          trip_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_attendant_id_fkey"
            columns: ["attendant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_current_stop_id_fkey"
            columns: ["current_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
      get_user_school_id: { Args: never; Returns: string }
      is_my_child: { Args: { _student_id: string }; Returns: boolean }
      is_my_child_bus: { Args: { _bus_id: string }; Returns: boolean }
      is_my_child_route: { Args: { _route_id: string }; Returns: boolean }
      is_my_child_trip: { Args: { _trip_id: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
