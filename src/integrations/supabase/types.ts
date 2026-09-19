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
      achievements: {
        Row: {
          citation: string
          created_at: string
          created_by_staff_id: string | null
          id: string
          is_private: boolean
          points: number
          source: string
          student_id: string
        }
        Insert: {
          citation: string
          created_at?: string
          created_by_staff_id?: string | null
          id?: string
          is_private?: boolean
          points: number
          source: string
          student_id: string
        }
        Update: {
          citation?: string
          created_at?: string
          created_by_staff_id?: string | null
          id?: string
          is_private?: boolean
          points?: number
          source?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          active_discount_percent: number
          branch: string
          created_at: string
          discount_expires_at: string | null
          id: string
          normalized_score: number
          section: string
          updated_at: string
          year: number
        }
        Insert: {
          active_discount_percent?: number
          branch: string
          created_at?: string
          discount_expires_at?: string | null
          id?: string
          normalized_score?: number
          section: string
          updated_at?: string
          year: number
        }
        Update: {
          active_discount_percent?: number
          branch?: string
          created_at?: string
          discount_expires_at?: string | null
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
          voucher_code: string | null
          voucher_note: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_cost: number
          reward_name: string
          status?: string
          student_id: string
          updated_at?: string
          voucher_code?: string | null
          voucher_note?: string
        }
        Update: {
          created_at?: string
          id?: string
          points_cost?: number
          reward_name?: string
          status?: string
          student_id?: string
          updated_at?: string
          voucher_code?: string | null
          voucher_note?: string
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
      reward_stock: {
        Row: {
          class_id: string
          created_at: string
          id: string
          remaining_stock: number | null
          reward_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          remaining_stock?: number | null
          reward_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          remaining_stock?: number | null
          reward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_stock_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_stock_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points_cost: number
          updated_at: string
          uses_label: string
          voucher_note: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          points_cost: number
          updated_at?: string
          uses_label?: string
          voucher_note?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points_cost?: number
          updated_at?: string
          uses_label?: string
          voucher_note?: string
        }
        Relationships: []
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
          is_campus_plus: boolean
          last_checkpoint_rank: number | null
          name: string
          password_hash: string
          personal_rank: number | null
          reputation: number
          section: string
          updated_at: string
          visibility: string
          year: number
        }
        Insert: {
          branch: string
          created_at?: string
          credit_balance?: number
          enrollment_number: string
          id?: string
          is_campus_plus?: boolean
          last_checkpoint_rank?: number | null
          name: string
          password_hash: string
          personal_rank?: number | null
          reputation?: number
          section: string
          updated_at?: string
          visibility?: string
          year?: number
        }
        Update: {
          branch?: string
          created_at?: string
          credit_balance?: number
          enrollment_number?: string
          id?: string
          is_campus_plus?: boolean
          last_checkpoint_rank?: number | null
          name?: string
          password_hash?: string
          personal_rank?: number | null
          reputation?: number
          section?: string
          updated_at?: string
          visibility?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      academic_points_for_sgpa: { Args: { p_sgpa: number }; Returns: number }
      apply_class_rewards: {
        Args: { p_staff_id: string }
        Returns: {
          class_label: string
          discount_percent: number
          expires_at: string
        }[]
      }
      apply_penalty: {
        Args: {
          p_points: number
          p_reason: string
          p_staff_id: string
          p_student_id: string
        }
        Returns: {
          message: string
          ok: boolean
        }[]
      }
      award_team_bonus: {
        Args: {
          p_event_id: string
          p_mvp_bonus?: number
          p_mvp_student_id?: string
          p_reputation_each: number
          p_staff_id: string
          p_student_ids: string[]
        }
        Returns: {
          awarded: number
        }[]
      }
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
      generate_voucher_code: { Args: never; Returns: string }
      my_achievements: {
        Args: { p_student_id: string }
        Returns: {
          citation: string
          created_at: string
          id: string
          is_private: boolean
          points: number
          source: string
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
      my_redemptions: {
        Args: { p_student_id: string }
        Returns: {
          created_at: string
          id: string
          points_cost: number
          reward_name: string
          status: string
          voucher_code: string
          voucher_note: string
        }[]
      }
      recompute_campus_stats: { Args: never; Returns: undefined }
      redeem_reward: {
        Args: { p_reward_id: string; p_student_id: string }
        Returns: {
          message: string
          ok: boolean
          redemption_id: string
          voucher_code: string
        }[]
      }
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
      run_checkpoint_bonuses: {
        Args: { p_staff_id: string }
        Returns: {
          growth_bonuses: number
          position_bonuses: number
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
      staff_fulfill_redemption: {
        Args: { p_redemption_id: string; p_staff_id: string }
        Returns: {
          red_id: string
          red_status: string
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
      staff_mark_voucher_used: {
        Args: { p_redemption_id: string; p_staff_id: string }
        Returns: {
          red_id: string
          red_status: string
        }[]
      }
      staff_my_penalties: {
        Args: { p_staff_id: string }
        Returns: {
          citation: string
          created_at: string
          enrollment_number: string
          id: string
          points: number
          student_name: string
        }[]
      }
      staff_pending_redemptions: {
        Args: { p_staff_id: string }
        Returns: {
          created_at: string
          enrollment_number: string
          id: string
          points_cost: number
          reward_name: string
          status: string
          student_name: string
        }[]
      }
      staff_search_students: {
        Args: { p_query: string; p_staff_id: string }
        Returns: {
          branch: string
          credit_balance: number
          enrollment_number: string
          id: string
          name: string
          reputation: number
          section: string
          year: number
        }[]
      }
      staff_vouchers: {
        Args: { p_query?: string; p_staff_id: string }
        Returns: {
          created_at: string
          enrollment_number: string
          id: string
          points_cost: number
          reward_name: string
          status: string
          student_name: string
          voucher_code: string
        }[]
      }
      student_campus_plus_status: {
        Args: { p_student_id: string }
        Returns: {
          is_campus_plus: boolean
        }[]
      }
      student_class_discount: {
        Args: { p_student_id: string }
        Returns: {
          class_label: string
          class_rank: number
          discount_percent: number
          expires_at: string
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
          reputation: number
          section: string
          visibility: string
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
      student_set_visibility: {
        Args: { p_student_id: string; p_visibility: string }
        Returns: {
          visibility: string
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
          reputation: number
          total_students: number
          visibility: string
          week_delta: number
        }[]
      }
      student_subscribe_campus_plus: {
        Args: { p_student_id: string }
        Returns: {
          is_campus_plus: boolean
          ok: boolean
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
