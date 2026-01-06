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
          overseer_email: string | null
          overseer_name: string | null
          overseer_phone: string | null
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
          overseer_email?: string | null
          overseer_name?: string | null
          overseer_phone?: string | null
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
          overseer_email?: string | null
          overseer_name?: string | null
          overseer_phone?: string | null
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
      groups: {
        Row: {
          branch_id: string | null
          church_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          church_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          church_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      member_groups: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          member_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          member_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_groups_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_spiritual_journeys: {
        Row: {
          id: string
          joined_at: string
          member_id: string
          spiritual_journey_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          member_id: string
          spiritual_journey_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          member_id?: string
          spiritual_journey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_spiritual_journeys_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_spiritual_journeys_spiritual_journey_id_fkey"
            columns: ["spiritual_journey_id"]
            isOneToOne: false
            referencedRelation: "spiritual_journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          admin_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          area_zone: string | null
          branch_id: string
          church_id: string
          created_at: string
          date_joined: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          how_heard: Database["public"]["Enums"]["how_heard"] | null
          id: string
          is_active: boolean | null
          is_baptized: boolean | null
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          member_code: string
          member_type: Database["public"]["Enums"]["member_type"] | null
          membership_status:
            | Database["public"]["Enums"]["membership_status"]
            | null
          ministry_group: string | null
          occupation: Database["public"]["Enums"]["occupation_type"] | null
          phone: string | null
          photo_url: string | null
          qr_code_token: string
          registered_by: string | null
          residential_area: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          area_zone?: string | null
          branch_id: string
          church_id: string
          created_at?: string
          date_joined?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          how_heard?: Database["public"]["Enums"]["how_heard"] | null
          id?: string
          is_active?: boolean | null
          is_baptized?: boolean | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          member_code: string
          member_type?: Database["public"]["Enums"]["member_type"] | null
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          ministry_group?: string | null
          occupation?: Database["public"]["Enums"]["occupation_type"] | null
          phone?: string | null
          photo_url?: string | null
          qr_code_token: string
          registered_by?: string | null
          residential_area?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          area_zone?: string | null
          branch_id?: string
          church_id?: string
          created_at?: string
          date_joined?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          how_heard?: Database["public"]["Enums"]["how_heard"] | null
          id?: string
          is_active?: boolean | null
          is_baptized?: boolean | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          member_code?: string
          member_type?: Database["public"]["Enums"]["member_type"] | null
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          ministry_group?: string | null
          occupation?: Database["public"]["Enums"]["occupation_type"] | null
          phone?: string | null
          photo_url?: string | null
          qr_code_token?: string
          registered_by?: string | null
          residential_area?: string | null
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
      service_uploads: {
        Row: {
          church_id: string
          expires_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          is_expired: boolean
          service_id: string
          storage_path: string
          upload_type: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          church_id: string
          expires_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          is_expired?: boolean
          service_id: string
          storage_path: string
          upload_type: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          church_id?: string
          expires_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          is_expired?: boolean
          service_id?: string
          storage_path?: string
          upload_type?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_uploads_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_uploads_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
      sms_campaigns: {
        Row: {
          audience_group_ids: string[] | null
          audience_member_ids: string[] | null
          audience_type: string
          church_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          credits_deducted: number
          failed_count: number | null
          id: string
          message_body: string
          recipient_count: number
          segments: number
          sent_count: number | null
          status: string
          use_first_name: boolean
        }
        Insert: {
          audience_group_ids?: string[] | null
          audience_member_ids?: string[] | null
          audience_type: string
          church_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          credits_deducted?: number
          failed_count?: number | null
          id?: string
          message_body: string
          recipient_count?: number
          segments?: number
          sent_count?: number | null
          status?: string
          use_first_name?: boolean
        }
        Update: {
          audience_group_ids?: string[] | null
          audience_member_ids?: string[] | null
          audience_type?: string
          church_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          credits_deducted?: number
          failed_count?: number | null
          id?: string
          message_body?: string
          recipient_count?: number
          segments?: number
          sent_count?: number | null
          status?: string
          use_first_name?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaigns_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_credit_purchases: {
        Row: {
          admin_user_id: string
          amount_paid: number
          church_id: string
          created_at: string
          credits_purchased: number
          currency: string
          hubtel_checkout_id: string | null
          hubtel_reference: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          amount_paid: number
          church_id: string
          created_at?: string
          credits_purchased: number
          currency?: string
          hubtel_checkout_id?: string | null
          hubtel_reference?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          amount_paid?: number
          church_id?: string
          created_at?: string
          credits_purchased?: number
          currency?: string
          hubtel_checkout_id?: string | null
          hubtel_reference?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_credit_purchases_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_jobs: {
        Row: {
          campaign_id: string
          church_id: string
          created_at: string
          id: string
          last_error: string | null
          member_id: string | null
          member_name: string | null
          personalized_message: string | null
          phone_number: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          church_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          member_id?: string | null
          member_name?: string | null
          personalized_message?: string | null
          phone_number: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          church_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          member_id?: string | null
          member_name?: string | null
          personalized_message?: string | null
          phone_number?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sms_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_jobs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_jobs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          body: string
          church_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          body: string
          church_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          body?: string
          church_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_wallets: {
        Row: {
          balance_credits: number
          church_id: string
          created_at: string
          id: string
          low_balance_threshold: number
          updated_at: string
        }
        Insert: {
          balance_credits?: number
          church_id: string
          created_at?: string
          id?: string
          low_balance_threshold?: number
          updated_at?: string
        }
        Update: {
          balance_credits?: number
          church_id?: string
          created_at?: string
          id?: string
          low_balance_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_wallets_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: true
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      spiritual_journeys: {
        Row: {
          church_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          church_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          church_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spiritual_journeys_church_id_fkey"
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
      visitor_followups: {
        Row: {
          church_id: string
          conducted_by: string | null
          created_at: string
          followup_date: string
          followup_type: Database["public"]["Enums"]["followup_type"]
          id: string
          notes: string | null
          visitor_id: string
        }
        Insert: {
          church_id: string
          conducted_by?: string | null
          created_at?: string
          followup_date: string
          followup_type: Database["public"]["Enums"]["followup_type"]
          id?: string
          notes?: string | null
          visitor_id: string
        }
        Update: {
          church_id?: string
          conducted_by?: string | null
          created_at?: string
          followup_date?: string
          followup_type?: Database["public"]["Enums"]["followup_type"]
          id?: string
          notes?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_followups_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_followups_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          address: string | null
          branch_id: string
          church_id: string
          converted_member_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          first_visit_date: string
          how_heard: Database["public"]["Enums"]["how_heard"]
          id: string
          last_name: string
          phone: string
          status: Database["public"]["Enums"]["visitor_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id: string
          church_id: string
          converted_member_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          first_visit_date?: string
          how_heard: Database["public"]["Enums"]["how_heard"]
          id?: string
          last_name: string
          phone: string
          status?: Database["public"]["Enums"]["visitor_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string
          church_id?: string
          converted_member_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          first_visit_date?: string
          how_heard?: Database["public"]["Enums"]["how_heard"]
          id?: string
          last_name?: string
          phone?: string
          status?: Database["public"]["Enums"]["visitor_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitors_converted_member_id_fkey"
            columns: ["converted_member_id"]
            isOneToOne: false
            referencedRelation: "members"
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
      approval_status: "pending" | "approved" | "rejected"
      checkin_method: "staff_scan" | "self_scan"
      followup_type: "sms" | "phone_call" | "visit" | "other"
      gender_type: "male" | "female" | "prefer_not_to_say"
      how_heard:
        | "friend_family"
        | "social_media"
        | "walk_in"
        | "outreach"
        | "other"
      marital_status: "single" | "married" | "divorced" | "widowed"
      member_type: "regular" | "occasional" | "worker"
      membership_status: "active" | "inactive" | "transferred"
      occupation_type:
        | "student"
        | "public_sector"
        | "private_sector"
        | "self_employed"
        | "unemployed"
        | "other"
      visitor_status: "new" | "in_follow_up" | "converted"
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
      approval_status: ["pending", "approved", "rejected"],
      checkin_method: ["staff_scan", "self_scan"],
      followup_type: ["sms", "phone_call", "visit", "other"],
      gender_type: ["male", "female", "prefer_not_to_say"],
      how_heard: [
        "friend_family",
        "social_media",
        "walk_in",
        "outreach",
        "other",
      ],
      marital_status: ["single", "married", "divorced", "widowed"],
      member_type: ["regular", "occasional", "worker"],
      membership_status: ["active", "inactive", "transferred"],
      occupation_type: [
        "student",
        "public_sector",
        "private_sector",
        "self_employed",
        "unemployed",
        "other",
      ],
      visitor_status: ["new", "in_follow_up", "converted"],
    },
  },
} as const
