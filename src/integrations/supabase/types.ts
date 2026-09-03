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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      app_calls: {
        Row: {
          answered_at: string | null
          callee_display_name: string | null
          callee_id: string
          callee_phone: string
          caller_display_name: string | null
          caller_id: string
          caller_phone: string
          caller_platform: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_video: boolean
          started_at: string
          status: string
        }
        Insert: {
          answered_at?: string | null
          callee_display_name?: string | null
          callee_id: string
          callee_phone: string
          caller_display_name?: string | null
          caller_id: string
          caller_phone: string
          caller_platform?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_video?: boolean
          started_at?: string
          status?: string
        }
        Update: {
          answered_at?: string | null
          callee_display_name?: string | null
          callee_id?: string
          callee_phone?: string
          caller_display_name?: string | null
          caller_id?: string
          caller_phone?: string
          caller_platform?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_video?: boolean
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      meeting_admins: {
        Row: {
          id: string
          meeting_id: string
          promoted_at: string | null
          promoted_by: string
          user_id: string
        }
        Insert: {
          id?: string
          meeting_id: string
          promoted_at?: string | null
          promoted_by: string
          user_id: string
        }
        Update: {
          id?: string
          meeting_id?: string
          promoted_at?: string | null
          promoted_by?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_captions: {
        Row: {
          content: string
          id: string
          meeting_id: string
          participant_id: string
          timestamp: string
        }
        Insert: {
          content: string
          id?: string
          meeting_id: string
          participant_id: string
          timestamp?: string
        }
        Update: {
          content?: string
          id?: string
          meeting_id?: string
          participant_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_captions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_captions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "meeting_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_file_shares: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_visible: boolean
          meeting_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          is_visible?: boolean
          meeting_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_visible?: boolean
          meeting_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      meeting_invitations: {
        Row: {
          created_at: string
          id: string
          invitee_email: string
          invitee_name: string | null
          scheduled_meeting_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_email: string
          invitee_name?: string | null
          scheduled_meeting_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_email?: string
          invitee_name?: string | null
          scheduled_meeting_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_invitations_scheduled_meeting_id_fkey"
            columns: ["scheduled_meeting_id"]
            isOneToOne: false
            referencedRelation: "scheduled_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_invite_call_recipients: {
        Row: {
          call_id: string
          created_at: string
          id: string
          invitee_email: string
          responded_at: string | null
          status: string
        }
        Insert: {
          call_id: string
          created_at?: string
          id?: string
          invitee_email: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          call_id?: string
          created_at?: string
          id?: string
          invitee_email?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_invite_call_recipients_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "meeting_invite_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_invite_calls: {
        Row: {
          created_at: string
          expires_at: string
          host_display_name: string | null
          host_id: string
          id: string
          is_video: boolean
          meeting_id: string
          scheduled_meeting_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          host_display_name?: string | null
          host_id: string
          id?: string
          is_video?: boolean
          meeting_id: string
          scheduled_meeting_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          host_display_name?: string | null
          host_id?: string
          id?: string
          is_video?: boolean
          meeting_id?: string
          scheduled_meeting_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_invite_calls_scheduled_meeting_id_fkey"
            columns: ["scheduled_meeting_id"]
            isOneToOne: false
            referencedRelation: "scheduled_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          city: string | null
          country: string | null
          id: string
          ip_address: string | null
          is_host: boolean
          is_muted: boolean
          joined_at: string
          left_at: string | null
          meeting_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string
          ip_address?: string | null
          is_host?: boolean
          is_muted?: boolean
          joined_at?: string
          left_at?: string | null
          meeting_id: string
          user_id: string
          user_name: string
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string
          ip_address?: string | null
          is_host?: boolean
          is_muted?: boolean
          joined_at?: string
          left_at?: string | null
          meeting_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_recordings: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          file_path: string
          file_size: number | null
          host_id: string
          id: string
          meeting_id: string
          started_at: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          file_path: string
          file_size?: number | null
          host_id: string
          id?: string
          meeting_id: string
          started_at?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          file_path?: string
          file_size?: number | null
          host_id?: string
          id?: string
          meeting_id?: string
          started_at?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          description: string | null
          host_id: string
          id: string
          is_active: boolean
          meeting_id: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          host_id: string
          id?: string
          is_active?: boolean
          meeting_id: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          host_id?: string
          id?: string
          is_active?: boolean
          meeting_id?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      platform_usage_logs: {
        Row: {
          action: string
          country: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_contacts: {
        Row: {
          contact_user_id: string | null
          created_at: string
          display_name: string
          id: string
          owner_id: string
          phone_number: string
        }
        Insert: {
          contact_user_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          owner_id: string
          phone_number: string
        }
        Update: {
          contact_user_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          owner_id?: string
          phone_number?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          attendees: string[]
          color: string
          created_at: string
          description: string | null
          end_time: string
          id: string
          is_all_day: boolean
          location: string | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          reminder_minutes: number | null
          start_time: string
          team_calendar_id: string | null
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          attendees?: string[]
          color?: string
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          is_all_day?: boolean
          location?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reminder_minutes?: number | null
          start_time: string
          team_calendar_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          attendees?: string[]
          color?: string
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          is_all_day?: boolean
          location?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reminder_minutes?: number | null
          start_time?: string
          team_calendar_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_team_calendar_id_fkey"
            columns: ["team_calendar_id"]
            isOneToOne: false
            referencedRelation: "team_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_scheduling_links: {
        Row: {
          buffer_minutes: number
          create_meeting: boolean
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buffer_minutes?: number
          create_meeting?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buffer_minutes?: number
          create_meeting?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_user_preferences: {
        Row: {
          created_at: string
          default_reminder_minutes: number
          timezone: string
          updated_at: string
          user_id: string
          work_days: number[]
          work_end: string
          work_start: string
        }
        Insert: {
          created_at?: string
          default_reminder_minutes?: number
          timezone?: string
          updated_at?: string
          user_id: string
          work_days?: number[]
          work_end?: string
          work_start?: string
        }
        Update: {
          created_at?: string
          default_reminder_minutes?: number
          timezone?: string
          updated_at?: string
          user_id?: string
          work_days?: number[]
          work_end?: string
          work_start?: string
        }
        Relationships: []
      }
      team_calendar_members: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          team_calendar_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: string
          team_calendar_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          team_calendar_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_calendar_members_team_calendar_id_fkey"
            columns: ["team_calendar_id"]
            isOneToOne: false
            referencedRelation: "team_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      team_calendars: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_meetings: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          host_id: string
          id: string
          is_recurring: boolean
          meeting_id: string
          meeting_link: string | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          scheduled_time: string
          status: string
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          host_id: string
          id?: string
          is_recurring?: boolean
          meeting_id: string
          meeting_link?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          scheduled_time: string
          status?: string
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          host_id?: string
          id?: string
          is_recurring?: boolean
          meeting_id?: string
          meeting_link?: string | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          scheduled_time?: string
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_phone_numbers: {
        Row: {
          created_at: string
          id: string
          phone_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      user_push_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          push_token: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          push_token: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          push_token?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_recent_meetings: {
        Row: {
          id: string
          is_host: boolean
          joined_at: string
          last_accessed: string
          meeting_id: string
          meeting_title: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_host?: boolean
          joined_at?: string
          last_accessed?: string
          meeting_id: string
          meeting_title?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_host?: boolean
          joined_at?: string
          last_accessed?: string
          meeting_id?: string
          meeting_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          biometrics_enabled: boolean | null
          camera_default_on: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          meeting_reminders: boolean | null
          microphone_default_on: boolean | null
          notifications_enabled: boolean | null
          push_notifications: boolean | null
          sound_enabled: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          biometrics_enabled?: boolean | null
          camera_default_on?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          meeting_reminders?: boolean | null
          microphone_default_on?: boolean | null
          notifications_enabled?: boolean | null
          push_notifications?: boolean | null
          sound_enabled?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          biometrics_enabled?: boolean | null
          camera_default_on?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          meeting_reminders?: boolean | null
          microphone_default_on?: boolean | null
          notifications_enabled?: boolean | null
          push_notifications?: boolean | null
          sound_enabled?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_participation_duration: {
        Args: { p_joined_at: string; p_left_at?: string }
        Returns: string
      }
      cancel_scheduled_meeting: {
        Args: { p_scheduled_id: string }
        Returns: Json
      }
      get_calendar_admin_stats: { Args: never; Returns: Json }
      get_due_calendar_reminders: {
        Args: { p_window_minutes?: number }
        Returns: {
          description: string | null
          end_time: string
          host_email: string
          location: string | null
          recipient_email: string
          recipient_name: string
          reminder_minutes: number
          source_id: string
          source_type: string
          start_time: string
          title: string
        }[]
      }
      mark_calendar_reminder_sent: {
        Args: {
          p_recipient_email: string
          p_reminder_minutes: number
          p_source_id: string
          p_source_type: string
        }
        Returns: undefined
      }
      book_scheduling_slot: {
        Args: {
          p_guest_email: string
          p_guest_name: string
          p_slug: string
          p_start_time: string
        }
        Returns: string
      }
      get_scheduling_busy_times: {
        Args: {
          p_from?: string
          p_slug: string
          p_to?: string
        }
        Returns: {
          end_time: string
          start_time: string
        }[]
      }
      get_scheduling_work_hours: {
        Args: { p_slug: string }
        Returns: {
          work_days: number[]
          work_end: string
          work_start: string
        }[]
      }
      current_user_email: { Args: never; Returns: string }
      generate_unique_phone_number: { Args: never; Returns: string }
      get_all_users_admin: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          email_confirmed_at: string
          id: string
          last_sign_in_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_meeting_host: {
        Args: { _meeting_id: string; _uid: string }
        Returns: boolean
      }
      is_meeting_participant: {
        Args: { _meeting_id: string; _uid: string }
        Returns: boolean
      }
      is_meeting_participant_by_code: {
        Args: { _code: string; _uid: string }
        Returns: boolean
      }
      log_platform_usage: {
        Args: { _action: string; _country?: string; _user_id: string }
        Returns: undefined
      }
      user_ids_for_invite_emails: {
        Args: { emails: string[] }
        Returns: {
          normalized_email: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
