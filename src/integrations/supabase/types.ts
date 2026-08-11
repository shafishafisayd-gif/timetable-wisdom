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
      evaluations: {
        Row: {
          academic_year: string | null
          class_id: string
          created_at: string
          day: string
          eval_date: string
          id: string
          mark: number | null
          period: number
          round_no: number
          status: string
          student_id: string
          subject: string
          teacher_code: string
        }
        Insert: {
          academic_year?: string | null
          class_id: string
          created_at?: string
          day: string
          eval_date?: string
          id?: string
          mark?: number | null
          period: number
          round_no?: number
          status: string
          student_id: string
          subject: string
          teacher_code: string
        }
        Update: {
          academic_year?: string | null
          class_id?: string
          created_at?: string
          day?: string
          eval_date?: string
          id?: string
          mark?: number | null
          period?: number
          round_no?: number
          status?: string
          student_id?: string
          subject?: string
          teacher_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      round_picks: {
        Row: {
          class_id: string
          id: string
          picked_at: string
          round_no: number
          student_id: string
          subject: string
          teacher_code: string
        }
        Insert: {
          class_id: string
          id?: string
          picked_at?: string
          round_no?: number
          student_id: string
          subject: string
          teacher_code: string
        }
        Update: {
          class_id?: string
          id?: string
          picked_at?: string
          round_no?: number
          student_id?: string
          subject?: string
          teacher_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_picks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_no: number
          class_id: string
          created_at: string
          id: string
          name: string
          sl_no: number | null
        }
        Insert: {
          admission_no: number
          class_id: string
          created_at?: string
          id?: string
          name: string
          sl_no?: number | null
        }
        Update: {
          admission_no?: number
          class_id?: string
          created_at?: string
          id?: string
          name?: string
          sl_no?: number | null
        }
        Relationships: []
      }
      syllabus_history: {
        Row: {
          academic_year: string
          changed_at: string
          class_id: string
          id: string
          month: number
          new_status: string
          previous_status: string | null
          subject: string
          teacher_code: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          changed_at?: string
          class_id: string
          id?: string
          month: number
          new_status: string
          previous_status?: string | null
          subject: string
          teacher_code: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          changed_at?: string
          class_id?: string
          id?: string
          month?: number
          new_status?: string
          previous_status?: string | null
          subject?: string
          teacher_code?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      syllabus_settings: {
        Row: {
          academic_year_name: string
          end_month: number
          id: number
          start_month: number
          updated_at: string
        }
        Insert: {
          academic_year_name?: string
          end_month?: number
          id?: number
          start_month?: number
          updated_at?: string
        }
        Update: {
          academic_year_name?: string
          end_month?: number
          id?: number
          start_month?: number
          updated_at?: string
        }
        Relationships: []
      }
      syllabus_status: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string
          id: string
          month: number
          status: string
          subject: string
          teacher_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string
          id?: string
          month: number
          status?: string
          subject: string
          teacher_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string
          id?: string
          month?: number
          status?: string
          subject?: string
          teacher_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      temp_timetable: {
        Row: {
          class_id: string
          created_at: string
          day_code: string
          id: string
          original_subject: string | null
          override_date: string
          period: number
          subject: string
          teacher_code: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          day_code: string
          id?: string
          original_subject?: string | null
          override_date: string
          period: number
          subject: string
          teacher_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          day_code?: string
          id?: string
          original_subject?: string | null
          override_date?: string
          period?: number
          subject?: string
          teacher_code?: string | null
          updated_at?: string
          updated_by?: string | null
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
