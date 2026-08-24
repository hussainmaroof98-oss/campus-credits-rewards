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
      classes: {
        Row: {
          branch: string
          created_at: string
          id: string
          normalized_score: number
          section: string
          updated_at: string
          year: number
        }
        Insert: {
          branch: string
          created_at?: string
          id?: string
          normalized_score?: number
          section: string
          updated_at?: string
          year: number
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          normalized_score?: number
          section?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          student_id: string
          team_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          student_id: string
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          student_id?: string
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          date: string | null
          description: string | null
          id: string
          status: string
          team_required: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string | null
          description?: string | null
          id?: string
          status?: string
          team_required?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string | null
          description?: string | null
          id?: string
          status?: string
          team_required?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      point_ledger: {
        Row: {
          created_at: string
          description: string
          id: string
          points: number
          source: string
          student_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          points: number
          source: string
          student_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          points?: number
          source?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch: string
          class_rank: string
          created_at: string
          credit_balance: number
          enrollment_number: string
          full_name: string
          id: string
          personal_rank: string
          section: string
          updated_at: string
          year: number
        }
        Insert: {
          branch?: string
          class_rank?: string
          created_at?: string
          credit_balance?: number
          enrollment_number: string
          full_name?: string
          id: string
          personal_rank?: string
          section?: string
          updated_at?: string
          year?: number
        }
        Update: {
          branch?: string
          class_rank?: string
          created_at?: string
          credit_balance?: number
          enrollment_number?: string
          full_name?: string
          id?: string
          personal_rank?: string
          section?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          created_at: string
          id: string
          points_cost: number
          reward_name: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_cost: number
          reward_name: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          points_cost?: number
          reward_name?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          department: string
          id: string
          name: string
          password_hash: string
          staff_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string
          id?: string
          name: string
          password_hash: string
          staff_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          name?: string
          password_hash?: string
          staff_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          branch: string
          created_at: string
          credit_balance: number
          enrollment_number: string
          id: string
          name: string
          password_hash: string
          personal_rank: number | null
          section: string
          updated_at: string
          year: number
        }
        Insert: {
          branch: string
          created_at?: string
          credit_balance?: number
          enrollment_number: string
          id?: string
          name: string
          password_hash: string
          personal_rank?: number | null
          section: string
          updated_at?: string
          year?: number
        }
        Update: {
          branch?: string
          created_at?: string
          credit_balance?: number
          enrollment_number?: string
          id?: string
          name?: string
          password_hash?: string
          personal_rank?: number | null
          section?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      class_leaderboard: {
        Args: never
        Returns: {
          avg_points: number
          branch: string
          id: string
          normalized_score: number
          rank: number
          section: string
          student_count: number
          year: number
        }[]
      }
      event_teammates: {
        Args: { p_event_id: string; p_team_name: string }
        Returns: {
          name: string
          student_id: string
          team_name: string
        }[]
      }
      my_event_registrations: {
        Args: { p_student_id: string }
        Returns: {
          created_at: string
          date: string
          description: string
          event_id: string
          event_status: string
          id: string
          status: string
          team_name: string
          team_required: boolean
          title: string
        }[]
      }
      recompute_campus_stats: { Args: never; Returns: undefined }
      register_for_event: {
        Args: { p_event_id: string; p_student_id: string; p_team_name?: string }
        Returns: {
          reg_created_at: string
          reg_event_id: string
          reg_id: string
          reg_status: string
          reg_student_id: string
          reg_team_name: string
        }[]
      }
      staff_approve_event: {
        Args: { p_approve: boolean; p_event_id: string; p_staff_id: string }
        Returns: {
          evt_id: string
          evt_status: string
        }[]
      }
      staff_award_points: {
        Args: {
          p_description: string
          p_event_id: string
          p_points: number
          p_staff_id: string
          p_student_id: string
        }
        Returns: {
          ledger_id: string
          ledger_points: number
        }[]
      }
      staff_create_event: {
        Args: {
          p_date?: string
          p_description?: string
          p_staff_id: string
          p_team_required?: boolean
          p_title: string
        }
        Returns: {
          evt_id: string
          evt_status: string
          evt_title: string
        }[]
      }
      staff_event_registrations: {
        Args: { p_event_id: string; p_staff_id: string }
        Returns: {
          branch: string
          credit_balance: number
          enrollment_number: string
          reg_status: string
          registration_id: string
          section: string
          student_id: string
          student_name: string
          team_name: string
          year: number
        }[]
      }
      staff_login: {
        Args: { p_password: string; p_staff_code: string }
        Returns: {
          department: string
          id: string
          name: string
          staff_code: string
        }[]
      }
      student_leaderboard: {
        Args: never
        Returns: {
          branch: string
          credit_balance: number
          id: string
          name: string
          personal_rank: number
          section: string
          year: number
        }[]
      }
      student_login: {
        Args: { p_enrollment_number: string; p_password: string }
        Returns: {
          branch: string
          credit_balance: number
          enrollment_number: string
          id: string
          name: string
          personal_rank: number
          section: string
          year: number
        }[]
      }
      student_register: {
        Args: {
          p_branch: string
          p_enrollment_number: string
          p_name: string
          p_password: string
          p_section: string
          p_year: number
        }
        Returns: {
          branch: string
          credit_balance: number
          enrollment_number: string
          id: string
          name: string
          personal_rank: number
          section: string
          year: number
        }[]
      }
      student_stats: {
        Args: { p_student_id: string }
        Returns: {
          class_count: number
          class_position: number
          class_rank: number
          class_size: number
          credit_balance: number
          next_class_label: string
          normalized_score: number
          personal_rank: number
          points_behind_next_class: number
          total_students: number
          week_delta: number
        }[]
      }
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
