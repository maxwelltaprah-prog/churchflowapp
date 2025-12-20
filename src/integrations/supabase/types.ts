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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          branch_id: string
          checked_in_at: string
          checked_in_by: string | null
          checkin_method: Database["public"]["Enums"]["checkin_method"] | null
          church_id: string
          id: string
          is_cross_branch: boolean | null
          member_home_branch_id: string | null
          member_id: string
          notes: string | null
          service_id: string
        }
        Insert: {
          branch_id: string
          checked_in_at?: string
          checked_in_by?: string | null
          checkin_method?: Database["public"]["Enums"]["checkin_method"] | null
          church_id: string
          id?: string
          is_cross_branch?: boolean | null
          member_home_branch_id?: string | null
          member_id: string
          notes?: string | null
          service_id: string
        }
        Update: {
          branch_id?: string
          checked_in_at?: string
          checked_in_by?: string | null
          checkin_method?: Database["public"]["Enums"]["checkin_method"] | null
          church_id?: string
          id?: string
          is_cross_branch?: boolean | null
          member_home_branch_id?: string | null
          member_id?: string
          notes?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_home_branch_id_fkey"
            columns: ["member_home_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          church_id: string
          created_at: string
          id: string
          is_active: boolean | null
          is_main_branch: boolean | null
          join_code: string
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          church_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_main_branch?: boolean | null
          join_code: string
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          church_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_main_branch?: boolean | null
          join_code?: string
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          branch_id: string | null
          church_id: string
          id: string
          message: string
          read_count: number | null
          sent_at: string
          sent_by: string
          target_filter: Json | null
          target_scope: string | null
          title: string
        }
        Insert: {
          branch_id?: string | null
          church_id: string
          id?: string
          message: string
          read_count?: number | null
          sent_at?: string
          sent_by: string
          target_filter?: Json | null
          target_scope?: string | null
          title: string
        }
        Update: {
          branch_id?: string | null
          church_id?: string
          id?: string
          message?: string
          read_count?: number | null
          sent_at?: string
          sent_by?: string
          target_filter?: Json | null
          target_scope?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          area_zone: string | null
          branch_id: string
          church_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_active: boolean | null
          member_code: string
          membership_status:
            | Database["public"]["Enums"]["membership_status"]
            | null
          ministry_group: string | null
          phone: string | null
          photo_url: string | null
          qr_code_token: string
          registered_by: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          area_zone?: string | null
          branch_id: string
          church_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean | null
          member_code: string
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          ministry_group?: string | null
          phone?: string | null
          photo_url?: string | null
          qr_code_token: string
          registered_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          area_zone?: string | null
          branch_id?: string
          church_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean | null
          member_code?: string
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          ministry_group?: string | null
          phone?: string | null
          photo_url?: string | null
          qr_code_token?: string
          registered_by?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          church_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          church_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          church_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          branch_id: string
          church_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          name: string
          service_date: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          church_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          service_date: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          church_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          service_date?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          branch_id: string | null
          church_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          church_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          church_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_branch: {
        Args: { _branch_id: string; _church_id: string; _user_id: string }
        Returns: boolean
      }
      generate_branch_code: {
        Args: { _branch_name: string; _church_slug: string }
        Returns: string
      }
      generate_member_code: { Args: { _church_slug: string }; Returns: string }
      get_user_church_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _church_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_branch_admin: {
        Args: { _branch_id: string; _church_id: string; _user_id: string }
        Returns: boolean
      }
      is_church_admin: {
        Args: { _church_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "church_admin" | "branch_admin" | "usher" | "member"
      checkin_method: "staff_scan" | "self_scan"
      gender_type: "male" | "female"
      membership_status: "member" | "visitor" | "new_convert"
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
      app_role: ["church_admin", "branch_admin", "usher", "member"],
      checkin_method: ["staff_scan", "self_scan"],
      gender_type: ["male", "female"],
      membership_status: ["member", "visitor", "new_convert"],
    },
  },
} as const
