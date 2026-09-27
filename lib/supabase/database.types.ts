export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          event_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_read_state_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      app_feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          request_id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          message: string
          request_id: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_admin_invitation_email_deliveries: {
        Row: {
          completed_at: string | null
          created_at: string
          event_id: string
          failure_code: string | null
          id: string
          invitation_id: string
          provider_message_id: string | null
          request_id: string
          requested_by_user_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          event_id: string
          failure_code?: string | null
          id?: string
          invitation_id: string
          provider_message_id?: string | null
          request_id: string
          requested_by_user_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          event_id?: string
          failure_code?: string | null
          id?: string
          invitation_id?: string
          provider_message_id?: string | null
          request_id?: string
          requested_by_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_admin_invitation_email_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_admin_invitation_email_deliveries_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "event_admin_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_admin_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_membership_id: string | null
          created_at: string
          email: string
          event_id: string
          expires_at: string
          id: string
          invited_by_membership_id: string
          request_id: string
          revoked_at: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_membership_id?: string | null
          created_at?: string
          email: string
          event_id: string
          expires_at?: string
          id?: string
          invited_by_membership_id: string
          request_id: string
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_membership_id?: string | null
          created_at?: string
          email?: string
          event_id?: string
          expires_at?: string
          id?: string
          invited_by_membership_id?: string
          request_id?: string
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_admin_invitations_acceptor_fkey"
            columns: ["event_id", "accepted_by_membership_id"]
            isOneToOne: false
            referencedRelation: "event_memberships"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "event_admin_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_admin_invitations_inviter_fkey"
            columns: ["event_id", "invited_by_membership_id"]
            isOneToOne: false
            referencedRelation: "event_memberships"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      event_audit_log: {
        Row: {
          action: string
          actor_membership_id: string | null
          actor_user_id: string | null
          created_at: string
          details: Json
          event_id: string
          id: number
          reason: string | null
          request_id: string
          target_entity_id: string | null
          target_entity_type: string
        }
        Insert: {
          action: string
          actor_membership_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_id: string
          id?: never
          reason?: string | null
          request_id: string
          target_entity_id?: string | null
          target_entity_type: string
        }
        Update: {
          action?: string
          actor_membership_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_id?: string
          id?: never
          reason?: string | null
          request_id?: string
          target_entity_id?: string | null
          target_entity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_audit_log_actor_membership_fkey"
            columns: ["event_id", "actor_membership_id"]
            isOneToOne: false
            referencedRelation: "event_memberships"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "event_audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          category: string
          created_at: string
          event_id: string
          id: string
          membership_id: string
          message: string
          request_id: string
        }
        Insert: {
          category: string
          created_at?: string
          event_id: string
          id?: string
          membership_id: string
          message: string
          request_id: string
        }
        Update: {
          category?: string
          created_at?: string
          event_id?: string
          id?: string
          membership_id?: string
          message?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_feedback_membership_fkey"
            columns: ["event_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "event_memberships"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      event_memberships: {
        Row: {
          created_at: string
          display_name_snapshot: string
          email_snapshot: string | null
          ended_at: string | null
          event_id: string
          id: string
          joined_at: string
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name_snapshot?: string
          email_snapshot?: string | null
          ended_at?: string | null
          event_id: string
          id?: string
          joined_at?: string
          role: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name_snapshot?: string
          email_snapshot?: string | null
          ended_at?: string | null
          event_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_memberships_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_networking_card_links: {
        Row: {
          event_id: string
          membership_id: string
          network: string
        }
        Insert: {
          event_id: string
          membership_id: string
          network: string
        }
        Update: {
          event_id?: string
          membership_id?: string
          network?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_networking_card_links_event_id_membership_id_fkey"
            columns: ["event_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "event_networking_cards"
            referencedColumns: ["event_id", "membership_id"]
          },
        ]
      }
      event_networking_cards: {
        Row: {
          created_at: string
          event_id: string
          membership_id: string
          public_token: string
          template: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          membership_id: string
          public_token?: string
          template?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          membership_id?: string
          public_token?: string
          template?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_networking_cards_event_id_membership_id_fkey"
            columns: ["event_id", "membership_id"]
            isOneToOne: true
            referencedRelation: "event_memberships"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      event_networking_scan_history: {
        Row: {
          event_id: string
          scanned_at: string
          scanned_membership_id: string
          scanner_membership_id: string
        }
        Insert: {
          event_id: string
          scanned_at?: string
          scanned_membership_id: string
          scanner_membership_id: string
        }
        Update: {
          event_id?: string
          scanned_at?: string
          scanned_membership_id?: string
          scanner_membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_networking_scan_history_event_id_scanned_membership__fkey"
            columns: ["event_id", "scanned_membership_id"]
            isOneToOne: false
            referencedRelation: "event_memberships"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "event_networking_scan_history_event_id_scanner_membership__fkey"
            columns: ["event_id", "scanner_membership_id"]
            isOneToOne: false
            referencedRelation: "event_memberships"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      event_notification_preferences: {
        Row: {
          event_id: string
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notification_preferences_membership_fkey"
            columns: ["event_id", "user_id"]
            isOneToOne: true
            referencedRelation: "event_memberships"
            referencedColumns: ["event_id", "user_id"]
          },
        ]
      }
      events: {
        Row: {
          accent_color: string
          archived_at: string | null
          cover_path: string | null
          created_at: string
          description: string | null
          ends_at: string
          ever_published: boolean
          id: string
          lifecycle: string
          logo_path: string | null
          name: string
          published_at: string | null
          slug: string
          starts_at: string
          status: string
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          theme: string
          theme_preset: string
          timezone: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          accent_color?: string
          archived_at?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          ever_published?: boolean
          id?: string
          lifecycle?: string
          logo_path?: string | null
          name: string
          published_at?: string | null
          slug: string
          starts_at: string
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          theme: string
          theme_preset?: string
          timezone?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          accent_color?: string
          archived_at?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          ever_published?: boolean
          id?: string
          lifecycle?: string
          logo_path?: string | null
          name?: string
          published_at?: string | null
          slug?: string
          starts_at?: string
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          theme?: string
          theme_preset?: string
          timezone?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      my_flow_bookmarks: {
        Row: {
          created_at: string
          event_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "my_flow_bookmarks_session_fkey"
            columns: ["event_id", "session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["event_id", "id"]
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
      networking_scan_history: {
        Row: {
          card_path: string
          scanned_at: string
          scanned_user_id: string
          scanner_id: string
        }
        Insert: {
          card_path: string
          scanned_at?: string
          scanned_user_id: string
          scanner_id: string
        }
        Update: {
          card_path?: string
          scanned_at?: string
          scanned_user_id?: string
          scanner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "networking_scan_history_scanned_user_id_fkey"
            columns: ["scanned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "networking_scan_history_scanner_id_fkey"
            columns: ["scanner_id"]
            isOneToOne: false
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
          event_id: string
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
          event_id: string
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
          event_id?: string
          id?: never
          notification_id?: string
          status?: string
          status_code?: number | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_event_notification_fkey"
            columns: ["event_id", "notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      notification_dispatches: {
        Row: {
          accepted_count: number
          attempt_count: number
          completed_at: string | null
          created_at: string
          event_id: string
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
          event_id: string
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
          event_id?: string
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
            foreignKeyName: "notification_dispatches_event_notification_fkey"
            columns: ["event_id", "notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          created_at: string
          event_id: string
          notification_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          notification_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_event_notification_fkey"
            columns: ["event_id", "notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["event_id", "id"]
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
          event_id: string
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
          event_id: string
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
          event_id?: string
          id?: string
          related_session_id?: string | null
          request_id?: string | null
          source?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_session_fkey"
            columns: ["event_id", "related_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      platform_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json
          event_id: string | null
          id: number
          request_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_id?: string | null
          id?: never
          request_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          event_id?: string | null
          id?: never
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_quota_overrides: {
        Row: {
          active_event_limit: number | null
          branding_upload_bytes: number | null
          event_admin_limit: number | null
          event_session_limit: number | null
          reason: string
          updated_at: string
          updated_by: string
          user_id: string
        }
        Insert: {
          active_event_limit?: number | null
          branding_upload_bytes?: number | null
          event_admin_limit?: number | null
          event_session_limit?: number | null
          reason: string
          updated_at?: string
          updated_by: string
          user_id: string
        }
        Update: {
          active_event_limit?: number | null
          branding_upload_bytes?: number | null
          event_admin_limit?: number | null
          event_session_limit?: number | null
          reason?: string
          updated_at?: string
          updated_by?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          is_active: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          is_active?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      platform_support_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          event_id: string
          expires_at: string
          id: string
          reason: string
          super_admin_user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          event_id: string
          expires_at: string
          id?: string
          reason: string
          super_admin_user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          reason?: string
          super_admin_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_support_sessions_super_admin_user_id_fkey"
            columns: ["super_admin_user_id"]
            isOneToOne: false
            referencedRelation: "platform_super_admins"
            referencedColumns: ["user_id"]
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
      session_seat_claims: {
        Row: {
          claimed_at: string
          event_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          event_id: string
          session_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          event_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_seat_claims_event_session_fkey"
            columns: ["event_id", "session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      session_speakers: {
        Row: {
          event_id: string
          session_id: string
          speaker_id: string
        }
        Insert: {
          event_id: string
          session_id: string
          speaker_id: string
        }
        Update: {
          event_id?: string
          session_id?: string
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_speakers_session_fkey"
            columns: ["event_id", "session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "session_speakers_speaker_fkey"
            columns: ["event_id", "speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers_sponsors"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_ended_at: string | null
          actual_started_at: string | null
          capacity: number | null
          claimed_seats: number
          description: string | null
          end_time: string
          event_id: string
          id: string
          published: boolean
          reminder_sent_at: string | null
          reserved_seats: number
          room: string | null
          seats_closed: boolean
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
          capacity?: number | null
          claimed_seats?: number
          description?: string | null
          end_time: string
          event_id: string
          id?: string
          published?: boolean
          reminder_sent_at?: string | null
          reserved_seats?: number
          room?: string | null
          seats_closed?: boolean
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
          capacity?: number | null
          claimed_seats?: number
          description?: string | null
          end_time?: string
          event_id?: string
          id?: string
          published?: boolean
          reminder_sent_at?: string | null
          reserved_seats?: number
          room?: string | null
          seats_closed?: boolean
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
          templates: number
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          network: string
          templates?: number
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          network?: string
          templates?: number
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
          created_at: string
          event_id: string
          id: string
          linkedin_url: string | null
          name: string
          organization: string | null
          photo_url: string | null
          published: boolean
          role: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          event_id: string
          id?: string
          linkedin_url?: string | null
          name: string
          organization?: string | null
          photo_url?: string | null
          published?: boolean
          role: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          event_id?: string
          id?: string
          linkedin_url?: string | null
          name?: string
          organization?: string | null
          photo_url?: string | null
          published?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speakers_sponsors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_event_admin_invitation: {
        Args: { invitation_token_hash: string; mutation_request_id: string }
        Returns: string
      }
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
      admin_create_speaker: {
        Args: {
          mutation_request_id: string
          speaker_bio: string
          speaker_linkedin_url: string
          speaker_name: string
          speaker_organization: string
          speaker_photo_url: string
          speaker_published: boolean
          speaker_role: string
          target_event_id: string
        }
        Returns: string
      }
      admin_delete_session: {
        Args: { mutation_request_id: string; target_session_id: string }
        Returns: string
      }
      admin_delete_speaker: {
        Args: { mutation_request_id: string; target_speaker_id: string }
        Returns: string
      }
      admin_get_attendee: {
        Args: { target_attendee_id: string }
        Returns: Json
      }
      admin_get_dashboard: { Args: never; Returns: Json }
      admin_get_notification: {
        Args: { target_notification_id: string }
        Returns: Json
      }
      admin_get_raffle_attendees: { Args: never; Returns: Json }
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
      admin_list_feedback: {
        Args: { result_limit?: number }
        Returns: {
          attendee_name: string
          attendee_photo_url: string
          category: string
          created_at: string
          id: string
          message: string
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
      admin_set_session_capacity: {
        Args: {
          mutation_request_id: string
          session_capacity: number
          session_reserved_seats: number
          session_seats_closed: boolean
          target_session_id: string
        }
        Returns: string
      }
      admin_set_session_published: {
        Args: {
          mutation_request_id: string
          next_published: boolean
          target_session_id: string
        }
        Returns: string
      }
      admin_set_session_speakers: {
        Args: {
          mutation_request_id: string
          target_session_id: string
          target_speaker_ids: string[]
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
      admin_set_speaker_published: {
        Args: {
          mutation_request_id: string
          next_published: boolean
          target_speaker_id: string
        }
        Returns: string
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
      admin_update_speaker: {
        Args: {
          mutation_request_id: string
          speaker_bio: string
          speaker_linkedin_url: string
          speaker_name: string
          speaker_organization: string
          speaker_photo_url: string
          speaker_role: string
          target_speaker_id: string
        }
        Returns: string
      }
      archive_event: {
        Args: {
          archive_reason: string
          mutation_request_id: string
          target_event_id: string
        }
        Returns: string
      }
      claim_session_seat: { Args: { target_session_id: string }; Returns: Json }
      complete_event_admin_invitation_email: {
        Args: {
          failure_code: string
          provider_message_id: string
          target_delivery_id: string
          was_sent: boolean
        }
        Returns: undefined
      }
      create_event: {
        Args: {
          event_description: string
          event_ends_at: string
          event_name: string
          event_slug: string
          event_starts_at: string
          event_timezone: string
          event_venue: string
          mutation_request_id: string
        }
        Returns: string
      }
      current_user_is_admin: { Args: never; Returns: boolean }
      delete_untouched_draft_event: {
        Args: {
          deletion_reason: string
          mutation_request_id: string
          target_event_id: string
        }
        Returns: string
      }
      end_event_support_session: {
        Args: { mutation_request_id: string; target_support_session_id: string }
        Returns: string
      }
      get_event_admin_invitation_preview: {
        Args: { invitation_token_hash: string }
        Returns: Json
      }
      get_event_branding_upload_limit: {
        Args: { target_event_id: string }
        Returns: number
      }
      get_event_networking_card: {
        Args: { card_token: string; target_event_id: string }
        Returns: Json
      }
      get_event_raffle_attendee_detail: {
        Args: { target_event_id: string; target_membership_id: string }
        Returns: Json
      }
      get_event_raffle_attendees: {
        Args: { target_event_id: string }
        Returns: Json
      }
      get_my_event_networking_card: {
        Args: { target_event_id: string }
        Returns: Json
      }
      get_my_event_networking_scans: {
        Args: { target_event_id: string }
        Returns: Json
      }
      get_my_networking_scan_history: {
        Args: never
        Returns: {
          card_path: string
          name: string
          photo_url: string
          scanned_at: string
        }[]
      }
      get_own_networking_card: {
        Args: never
        Returns: {
          is_public: boolean
          network: string
          public_token: string
          templates: number
          url: string
        }[]
      }
      get_public_event_program: { Args: { event_slug: string }; Returns: Json }
      get_public_networking_card: {
        Args: { card_token: string }
        Returns: {
          name: string
          network: string
          photo_url: string
          templates: number
          url: string
        }[]
      }
      issue_event_admin_invitation: {
        Args: {
          invitation_token_hash: string
          invite_email: string
          mutation_request_id: string
          target_event_id: string
        }
        Returns: string
      }
      join_event: {
        Args: { mutation_request_id: string; target_event_id: string }
        Returns: string
      }
      leave_event: {
        Args: { mutation_request_id: string; target_event_id: string }
        Returns: string
      }
      list_event_feedback: {
        Args: { result_limit?: number; target_event_id: string }
        Returns: {
          attendee_name: string
          category: string
          created_at: string
          id: string
          message: string
        }[]
      }
      mark_alerts_read: { Args: never; Returns: undefined }
      mark_event_alerts_read: {
        Args: { target_event_id: string }
        Returns: undefined
      }
      moderate_event_attendee: {
        Args: {
          moderation_reason: string
          mutation_request_id: string
          next_status: string
          target_membership_id: string
        }
        Returns: string
      }
      platform_super_admin_event: {
        Args: { target_event_id: string }
        Returns: Json
      }
      platform_super_admin_list_attendees: {
        Args: {
          cursor_id?: string
          cursor_joined_at?: string
          result_limit?: number
          search_query?: string
          status_filter?: string
          target_event_id: string
        }
        Returns: Json
      }
      platform_super_admin_list_audit: {
        Args: { cursor_id?: number; result_limit?: number }
        Returns: Json
      }
      platform_super_admin_list_events: {
        Args: {
          cursor_id?: string
          cursor_updated_at?: string
          lifecycle_filter?: string
          result_limit?: number
          search_query?: string
          suspended_filter?: boolean
        }
        Returns: Json
      }
      platform_super_admin_list_feedback: {
        Args: {
          category_filter?: string
          cursor_created_at?: string
          cursor_id?: string
          result_limit?: number
        }
        Returns: Json
      }
      platform_super_admin_list_users: {
        Args: {
          cursor_created_at?: string
          cursor_id?: string
          result_limit?: number
          search_query?: string
        }
        Returns: Json
      }
      platform_super_admin_overview: { Args: never; Returns: Json }
      platform_super_admin_user: {
        Args: { target_user_id: string }
        Returns: Json
      }
      publish_event: {
        Args: { mutation_request_id: string; target_event_id: string }
        Returns: string
      }
      record_event_networking_scan: {
        Args: { card_token: string; target_event_id: string }
        Returns: undefined
      }
      record_networking_card_scan: {
        Args: { card_token: string }
        Returns: undefined
      }
      release_session_seat: {
        Args: { target_session_id: string }
        Returns: Json
      }
      remove_event_admin: {
        Args: {
          mutation_request_id: string
          removal_reason: string
          target_membership_id: string
        }
        Returns: string
      }
      reserve_event_admin_invitation_email: {
        Args: { mutation_request_id: string; target_invitation_id: string }
        Returns: string
      }
      retry_push_dispatches: { Args: never; Returns: undefined }
      revoke_event_admin_invitation: {
        Args: {
          mutation_request_id: string
          revocation_reason: string
          target_invitation_id: string
        }
        Returns: string
      }
      save_event_networking_card: {
        Args: {
          selected_networks: string[]
          selected_template: number
          target_event_id: string
        }
        Returns: undefined
      }
      save_event_reusable_social_links: {
        Args: {
          facebook_url: string
          github_url: string
          instagram_url: string
          linkedin_url: string
          target_event_id: string
        }
        Returns: undefined
      }
      save_social_profiles:
        | {
            Args: {
              facebook_url: string
              instagram_url: string
              linkedin_url: string
            }
            Returns: undefined
          }
        | {
            Args: {
              facebook_url: string
              github_url: string
              instagram_url: string
              linkedin_url: string
            }
            Returns: undefined
          }
      send_event_alert: {
        Args: {
          alert_body: string
          alert_title: string
          audience: string
          mutation_request_id: string
          target_event_id: string
          target_membership_ids: string[]
        }
        Returns: Json
      }
      set_event_branding: {
        Args: {
          asset_kind: string
          asset_path: string
          mutation_request_id: string
          target_event_id: string
        }
        Returns: string
      }
      set_event_push_preference: {
        Args: { enabled: boolean; target_event_id: string }
        Returns: boolean
      }
      set_event_suspension: {
        Args: {
          mutation_request_id: string
          should_suspend: boolean
          suspension_note: string
          target_event_id: string
        }
        Returns: string
      }
      set_networking_card_template: {
        Args: { p_template: number }
        Returns: undefined
      }
      set_platform_quota_override: {
        Args: {
          change_reason: string
          mutation_request_id: string
          next_active_event_limit: number
          next_branding_upload_bytes: number
          next_event_admin_limit: number
          next_event_session_limit: number
          target_user_id: string
        }
        Returns: string
      }
      start_event_support_session: {
        Args: {
          mutation_request_id: string
          support_reason: string
          target_event_id: string
        }
        Returns: string
      }
      submit_app_feedback: {
        Args: {
          feedback_category: string
          feedback_message: string
          feedback_request_id: string
        }
        Returns: undefined
      }
      submit_event_feedback: {
        Args: {
          feedback_category: string
          feedback_message: string
          feedback_request_id: string
          target_event_id: string
        }
        Returns: undefined
      }
      sync_program_flow_statuses: { Args: never; Returns: undefined }
      toggle_my_flow_bookmark: {
        Args: { target_session_id: string }
        Returns: Json
      }
      transfer_event_ownership: {
        Args: {
          mutation_request_id: string
          next_owner_membership_id: string
          target_event_id: string
        }
        Returns: string
      }
      update_event_basics: {
        Args: {
          event_description: string
          event_ends_at: string
          event_name: string
          event_starts_at: string
          event_timezone: string
          event_venue: string
          mutation_request_id: string
          target_event_id: string
        }
        Returns: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
