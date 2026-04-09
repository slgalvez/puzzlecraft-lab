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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          profile_id: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          profile_id?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          profile_id?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      authorized_users: {
        Row: {
          created_at: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          password_hash: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          password_hash: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          password_hash?: string
        }
        Relationships: []
      }
      call_signals: {
        Row: {
          call_id: string
          created_at: string
          id: string
          payload: Json
          sender_profile_id: string
          signal_type: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          payload: Json
          sender_profile_id: string
          signal_type: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          payload?: Json
          sender_profile_id?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_signals_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          callee_profile_id: string
          caller_profile_id: string
          connected_at: string | null
          conversation_id: string
          end_reason: string | null
          ended_at: string | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          callee_profile_id: string
          caller_profile_id: string
          connected_at?: string | null
          conversation_id: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Update: {
          callee_profile_id?: string
          caller_profile_id?: string
          connected_at?: string | null
          conversation_id?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_callee_profile_id_fkey"
            columns: ["callee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_caller_profile_id_fkey"
            columns: ["caller_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_nicknames: {
        Row: {
          contact_profile_id: string
          created_at: string
          id: string
          nickname: string
          owner_profile_id: string
          updated_at: string
        }
        Insert: {
          contact_profile_id: string
          created_at?: string
          id?: string
          nickname: string
          owner_profile_id: string
          updated_at?: string
        }
        Update: {
          contact_profile_id?: string
          created_at?: string
          id?: string
          nickname?: string
          owner_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_nicknames_contact_profile_id_fkey"
            columns: ["contact_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_nicknames_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          admin_profile_id: string
          admin_typing_at: string | null
          cleared_at_admin: string | null
          cleared_at_user: string | null
          created_at: string
          disappearing_duration: string
          disappearing_enabled: boolean
          disappearing_enabled_by: string | null
          disappearing_updated_at: string | null
          id: string
          user_profile_id: string
          user_typing_at: string | null
        }
        Insert: {
          admin_profile_id: string
          admin_typing_at?: string | null
          cleared_at_admin?: string | null
          cleared_at_user?: string | null
          created_at?: string
          disappearing_duration?: string
          disappearing_enabled?: boolean
          disappearing_enabled_by?: string | null
          disappearing_updated_at?: string | null
          id?: string
          user_profile_id: string
          user_typing_at?: string | null
        }
        Update: {
          admin_profile_id?: string
          admin_typing_at?: string | null
          cleared_at_admin?: string | null
          cleared_at_user?: string | null
          created_at?: string
          disappearing_duration?: string
          disappearing_enabled?: boolean
          disappearing_enabled_by?: string | null
          disappearing_updated_at?: string | null
          id?: string
          user_profile_id?: string
          user_typing_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_admin_profile_id_fkey"
            columns: ["admin_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_disappearing_enabled_by_fkey"
            columns: ["disappearing_enabled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      craft_recipients: {
        Row: {
          completed_at: string | null
          created_at: string
          display_name: string
          id: string
          puzzle_id: string
          recipient_name: string
          solve_time: number | null
          started_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          display_name?: string
          id: string
          puzzle_id: string
          recipient_name?: string
          solve_time?: number | null
          started_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          display_name?: string
          id?: string
          puzzle_id?: string
          recipient_name?: string
          solve_time?: number | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "craft_recipients_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "shared_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_weekly_packs: {
        Row: {
          created_at: string
          description: string
          emoji: string
          from_date: string
          id: string
          is_active: boolean
          puzzles: Json
          theme: string
          to_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          emoji?: string
          from_date: string
          id?: string
          is_active?: boolean
          puzzles?: Json
          theme: string
          to_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          emoji?: string
          from_date?: string
          id?: string
          is_active?: boolean
          puzzles?: Json
          theme?: string
          to_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_scores: {
        Row: {
          created_at: string | null
          date_str: string
          display_name: string | null
          id: string
          puzzle_type: string
          solve_time: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_str: string
          display_name?: string | null
          id?: string
          puzzle_type: string
          solve_time: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_str?: string
          display_name?: string | null
          id?: string
          puzzle_type?: string
          solve_time?: number
          user_id?: string | null
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempted_code: string
          attempted_name: string
          created_at: string
          id: string
          ip_address: string
          user_agent: string | null
        }
        Insert: {
          attempted_code: string
          attempted_name: string
          created_at?: string
          id?: string
          ip_address: string
          user_agent?: string | null
        }
        Update: {
          attempted_code?: string
          attempted_name?: string
          created_at?: string
          id?: string
          ip_address?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          user_id_a: string
          user_id_b: string
        }
        Insert: {
          created_at?: string
          user_id_a: string
          user_id_b: string
        }
        Update: {
          created_at?: string
          user_id_a?: string
          user_id_b?: string
        }
        Relationships: []
      }
      ip_blocklist: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          id: string
          ip_address: string
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          id?: string
          ip_address: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          id?: string
          ip_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_blocklist_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_entries: {
        Row: {
          display_name: string
          id: string
          previous_rating: number
          rating: number
          rating_updated_at: string
          skill_tier: string
          solve_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          display_name?: string
          id?: string
          previous_rating?: number
          rating?: number
          rating_updated_at?: string
          skill_tier?: string
          solve_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          display_name?: string
          id?: string
          previous_rating?: number
          rating?: number
          rating_updated_at?: string
          skill_tier?: string
          solve_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      location_shares: {
        Row: {
          accuracy: number | null
          active: boolean
          conversation_id: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          sharer_profile_id: string
          updated_at: string
          viewer_profile_id: string
        }
        Insert: {
          accuracy?: number | null
          active?: boolean
          conversation_id: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          sharer_profile_id: string
          updated_at?: string
          viewer_profile_id: string
        }
        Update: {
          accuracy?: number | null
          active?: boolean
          conversation_id?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          sharer_profile_id?: string
          updated_at?: string
          viewer_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_shares_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_shares_sharer_profile_id_fkey"
            columns: ["sharer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_shares_viewer_profile_id_fkey"
            columns: ["viewer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_disappearing: boolean
          reactions: Json
          read_at: string | null
          sender_profile_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_disappearing?: boolean
          reactions?: Json
          read_at?: string | null
          sender_profile_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_disappearing?: boolean
          reactions?: Json
          read_at?: string | null
          sender_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      private_puzzles: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_draft: boolean
          puzzle_data: Json
          puzzle_type: string
          reveal_message: string | null
          sent_to: string
          solve_time: number | null
          solved_at: string | null
          solved_by: string | null
          solver_state: Json | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_draft?: boolean
          puzzle_data: Json
          puzzle_type: string
          reveal_message?: string | null
          sent_to: string
          solve_time?: number | null
          solved_at?: string | null
          solved_by?: string | null
          solver_state?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_draft?: boolean
          puzzle_data?: Json
          puzzle_type?: string
          reveal_message?: string | null
          sent_to?: string
          solve_time?: number | null
          solved_at?: string | null
          solved_by?: string | null
          solver_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "private_puzzles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_puzzles_sent_to_fkey"
            columns: ["sent_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_puzzles_solved_by_fkey"
            columns: ["solved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_cleared_at: string | null
          authorized_user_id: string
          created_at: string
          first_name: string
          focus_loss_protection: boolean
          id: string
          last_name: string
          role: string
          session_version: number
        }
        Insert: {
          activity_cleared_at?: string | null
          authorized_user_id: string
          created_at?: string
          first_name: string
          focus_loss_protection?: boolean
          id?: string
          last_name: string
          role?: string
          session_version?: number
        }
        Update: {
          activity_cleared_at?: string | null
          authorized_user_id?: string
          created_at?: string
          first_name?: string
          focus_loss_protection?: boolean
          id?: string
          last_name?: string
          role?: string
          session_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_authorized_user_id_fkey"
            columns: ["authorized_user_id"]
            isOneToOne: true
            referencedRelation: "authorized_users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_push_at: string | null
          p256dh: string
          profile_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_push_at?: string | null
          p256dh: string
          profile_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_push_at?: string | null
          p256dh?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_puzzles: {
        Row: {
          completed_at: string | null
          created_at: string
          creator_solve_time: number | null
          creator_solved_at: string | null
          id: string
          payload: Json
          solve_time: number | null
          started_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          creator_solve_time?: number | null
          creator_solved_at?: string | null
          id: string
          payload: Json
          solve_time?: number | null
          started_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          creator_solve_time?: number | null
          creator_solved_at?: string | null
          id?: string
          payload?: Json
          solve_time?: number | null
          started_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          friend_code: string | null
          friend_code_visible: boolean | null
          id: string
          is_admin: boolean
          is_premium: boolean
          rating: number | null
          rating_tier: string | null
          solves_count: number | null
          stripe_customer_id: string | null
          subscribed: boolean | null
          subscription_expires_at: string | null
          subscription_platform: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          friend_code?: string | null
          friend_code_visible?: boolean | null
          id: string
          is_admin?: boolean
          is_premium?: boolean
          rating?: number | null
          rating_tier?: string | null
          solves_count?: number | null
          stripe_customer_id?: string | null
          subscribed?: boolean | null
          subscription_expires_at?: string | null
          subscription_platform?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          friend_code?: string | null
          friend_code_visible?: boolean | null
          id?: string
          is_admin?: boolean
          is_premium?: boolean
          rating?: number | null
          rating_tier?: string | null
          solves_count?: number | null
          stripe_customer_id?: string | null
          subscribed?: boolean | null
          subscription_expires_at?: string | null
          subscription_platform?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completions: Json
          daily_data: Json
          endless_data: Json
          id: string
          solves: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completions?: Json
          daily_data?: Json
          endless_data?: Json
          id?: string
          solves?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completions?: Json
          daily_data?: Json
          endless_data?: Json
          id?: string
          solves?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_friend_code: { Args: never; Returns: string }
      upsert_leaderboard_entry: {
        Args: {
          p_display_name: string
          p_previous_rating: number
          p_rating: number
          p_skill_tier: string
          p_solve_count: number
          p_user_id: string
        }
        Returns: undefined
      }
      user_has_active_subscription: { Args: never; Returns: boolean }
      user_is_admin: { Args: never; Returns: boolean }
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
