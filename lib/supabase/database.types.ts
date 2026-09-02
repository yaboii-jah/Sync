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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
          request_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: never
          request_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: never
          request_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      alert_read_state: {
        Row: {
          last_read_at: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          ends_at: string
          id: string
          name: string
          starts_at: string
          status: string
          venue: string | null
        }
        Insert: {
          ends_at: string
          id?: string
          name: string
          starts_at: string
          status?: string
          venue?: string | null
        }
        Update: {
          ends_at?: string
          id?: string
          name?: string
          starts_at?: string
          status?: string
          venue?: string | null
        }
        Relationships: []
      }
      merch_attendees: {
        Row: {
          claim_method: string | null
          claimed_at: string | null
          claimed_by: string | null
          extra: Json
          first_name: string
          id: string
          last_name: string
          note: string | null
          updated_at: string
        }
        Insert: {
          claim_method?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          extra?: Json
          first_name?: string
          id: string
          last_name: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          claim_method?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          extra?: Json
          first_name?: string
          id?: string
          last_name?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      merch_scan_log: {
        Row: {
          at: string
          attendee_id: string | null
          attendee_name: string | null
          device: string
          outcome: string
          raw: string | null
          received_at: string
          uid: string
        }
        Insert: {
          at: string
          attendee_id?: string | null
          attendee_name?: string | null
          device: string
          outcome: string
          raw?: string | null
          received_at?: string
          uid: string
        }
        Update: {
          at?: string
          attendee_id?: string | null
          attendee_name?: string | null
          device?: string
          outcome?: string
          raw?: string | null
          received_at?: string
          uid?: string
        }
        Relationships: []
      }
      my_flow_bookmarks: {
        Row: {
          created_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "my_flow_bookmarks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      networking_cards: {
        Row: {
          created_at: string
          is_public: boolean
          public_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_public?: boolean
          public_token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_public?: boolean
          public_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "networking_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempted_at: string
          device_id: string
          error: string | null
          id: number
          notification_id: string
          status: string
          status_code: number | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          device_id: string
          error?: string | null
          id?: never
          notification_id: string
          status: string
          status_code?: number | null
          subscription_id: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          device_id?: string
          error?: string | null
          id?: never
          notification_id?: string
          status?: string
          status_code?: number | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dispatches: {
        Row: {
          accepted_count: number
          attempt_count: number
          completed_at: string | null
          created_at: string
          failed_count: number
          last_error: string | null
          no_subscription_count: number
          notification_id: string
          pruned_count: number
          recipient_count: number
          started_at: string | null
          status: string
          target_device_count: number
        }
        Insert: {
          accepted_count?: number
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          failed_count?: number
          last_error?: string | null
          no_subscription_count?: number
          notification_id: string
          pruned_count?: number
          recipient_count?: number
          started_at?: string | null
          status?: string
          target_device_count?: number
        }
        Update: {
          accepted_count?: number
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          failed_count?: number
          last_error?: string | null
          no_subscription_count?: number
          notification_id?: string
          pruned_count?: number
          recipient_count?: number
          started_at?: string | null
          status?: string
          target_device_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "notification_dispatches_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          created_at: string
          notification_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notification_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience_kind: string
          audience_summary: Json
          body: string | null
          created_at: string
          created_by: string | null
          dedupe_key: string | null
          id: string
          related_session_id: string | null
          request_id: string | null
          source: string
          title: string
          type: string
        }
        Insert: {
          audience_kind?: string
          audience_summary?: Json
          body?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          id?: string
          related_session_id?: string | null
          request_id?: string | null
          source?: string
          title: string
          type: string
        }
        Update: {
          audience_kind?: string
          audience_summary?: Json
          body?: string | null
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          id?: string
          related_session_id?: string | null
          request_id?: string | null
          source?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_session_id_fkey"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          pass_type: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string
          pass_type?: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pass_type?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_id: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_id?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_id?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_links: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          label: string
          url: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          url: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          url?: string
        }
        Relationships: []
      }
      session_speakers: {
        Row: {
          session_id: string
          speaker_id: string
        }
        Insert: {
          session_id: string
          speaker_id: string
        }
        Update: {
          session_id?: string
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_speakers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_speakers_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers_sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_ended_at: string | null
          actual_started_at: string | null
          description: string | null
          end_time: string
          event_id: string
          id: string
          published: boolean
          reminder_sent_at: string | null
          room: string | null
          start_time: string
          status: string
          status_override: string | null
          status_override_at: string | null
          status_override_by: string | null
          title: string
        }
        Insert: {
          actual_ended_at?: string | null
          actual_started_at?: string | null
          description?: string | null
          end_time: string
          event_id: string
          id?: string
          published?: boolean
          reminder_sent_at?: string | null
          room?: string | null
          start_time: string
          status?: string
          status_override?: string | null
          status_override_at?: string | null
          status_override_by?: string | null
          title: string
        }
        Update: {
          actual_ended_at?: string | null
          actual_started_at?: string | null
          description?: string | null
          end_time?: string
          event_id?: string
          id?: string
          published?: boolean
          reminder_sent_at?: string | null
          room?: string | null
          start_time?: string
          status?: string
          status_override?: string | null
          status_override_at?: string | null
          status_override_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      social_profiles: {
        Row: {
          created_at: string
          network: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          network: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          network?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      speakers_sponsors: {
        Row: {
          bio: string | null
          id: string
          linkedin_url: string | null
          name: string
          organization: string | null
          photo_url: string | null
          role: string
        }
        Insert: {
          bio?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          organization?: string | null
          photo_url?: string | null
          role: string
        }
        Update: {
          bio?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          organization?: string | null
          photo_url?: string | null
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_notification: {
        Args: {
          audience: string
          mutation_request_id: string
          notification_body: string
          notification_title: string
          recipient_ids: string[]
        }
        Returns: {
          device_count: number
          notification_id: string
          recipient_count: number
        }[]
      }
      admin_create_session: {
        Args: {
          mutation_request_id: string
          session_description: string
          session_end_time: string
          session_published: boolean
          session_room: string
          session_start_time: string
          session_title: string
          target_event_id: string
        }
        Returns: string
      }
      admin_delete_session: {
        Args: { mutation_request_id: string; target_session_id: string }
        Returns: string
      }
      admin_get_dashboard: { Args: never; Returns: Json }
      admin_get_notification: {
        Args: { target_notification_id: string }
        Returns: Json
      }
      admin_list_audit: {
        Args: { result_limit?: number; result_offset?: number }
        Returns: {
          action: string
          actor_id: string
          actor_name: string
          created_at: string
          details: Json
          entity_id: string
          entity_type: string
          id: number
        }[]
      }
      admin_list_notifications: {
        Args: { result_limit?: number; result_offset?: number }
        Returns: {
          accepted_count: number
          audience_kind: string
          body: string
          created_at: string
          dispatch_status: string
          failed_count: number
          id: string
          no_subscription_count: number
          pruned_count: number
          recipient_count: number
          source: string
          target_device_count: number
          title: string
          type: string
        }[]
      }
      admin_search_attendees: {
        Args: {
          result_limit?: number
          result_offset?: number
          search_query?: string
        }
        Returns: {
          created_at: string
          id: string
          name: string
          photo_url: string
          push_device_count: number
        }[]
      }
      admin_set_session_published: {
        Args: {
          mutation_request_id: string
          next_published: boolean
          target_session_id: string
        }
        Returns: string
      }
      admin_set_session_status: {
        Args: {
          action: string
          mutation_request_id: string
          send_notification: boolean
          target_session_id: string
        }
        Returns: {
          actual_ended_at: string
          actual_started_at: string
          session_id: string
          status: string
          status_override: string
          status_override_at: string
        }[]
      }
      admin_update_session: {
        Args: {
          mutation_request_id: string
          session_description: string
          session_end_time: string
          session_room: string
          session_start_time: string
          session_title: string
          target_session_id: string
        }
        Returns: string
      }
      current_user_is_admin: { Args: never; Returns: boolean }
      get_own_networking_card: {
        Args: never
        Returns: {
          is_public: boolean
          network: string
          public_token: string
          url: string
        }[]
      }
      get_public_networking_card: {
        Args: { card_token: string }
        Returns: {
          name: string
          network: string
          photo_url: string
          url: string
        }[]
      }
      mark_alerts_read: { Args: never; Returns: undefined }
      merch_claim_attendee: {
        Args: {
          p_at: string
          p_by: string
          p_id: string
          p_method: string
          p_note: string
        }
        Returns: {
          claim_method: string | null
          claimed_at: string | null
          claimed_by: string | null
          extra: Json
          first_name: string
          id: string
          last_name: string
          note: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "merch_attendees"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      merch_revert_claim: {
        Args: { p_by: string; p_id: string }
        Returns: {
          claim_method: string | null
          claimed_at: string | null
          claimed_by: string | null
          extra: Json
          first_name: string
          id: string
          last_name: string
          note: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "merch_attendees"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retry_push_dispatches: { Args: never; Returns: undefined }
      save_social_profiles: {
        Args: {
          facebook_url: string
          instagram_url: string
          linkedin_url: string
        }
        Returns: undefined
      }
      set_networking_card_public: {
        Args: { published: boolean }
        Returns: boolean
      }
      sync_program_flow_statuses: { Args: never; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
