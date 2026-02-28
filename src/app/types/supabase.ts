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
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      audio_video_assignments: {
        Row: {
          attendants: string[] | null
          attendants_member_ids: string[] | null
          created_at: string | null
          date: string
          id: string
          image: string
          image_member_id: string | null
          roving_mic_1: string
          roving_mic_1_member_id: string | null
          roving_mic_2: string
          roving_mic_2_member_id: string | null
          sound: string
          sound_member_id: string | null
          stage: string
          stage_member_id: string | null
          weekday: string
        }
        Insert: {
          attendants?: string[] | null
          attendants_member_ids?: string[] | null
          created_at?: string | null
          date: string
          id?: string
          image: string
          image_member_id?: string | null
          roving_mic_1: string
          roving_mic_1_member_id?: string | null
          roving_mic_2: string
          roving_mic_2_member_id?: string | null
          sound: string
          sound_member_id?: string | null
          stage: string
          stage_member_id?: string | null
          weekday: string
        }
        Update: {
          attendants?: string[] | null
          attendants_member_ids?: string[] | null
          created_at?: string | null
          date?: string
          id?: string
          image?: string
          image_member_id?: string | null
          roving_mic_1?: string
          roving_mic_1_member_id?: string | null
          roving_mic_2?: string
          roving_mic_2_member_id?: string | null
          sound?: string
          sound_member_id?: string | null
          stage?: string
          stage_member_id?: string | null
          weekday?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_video_assignments_image_member_id_fkey"
            columns: ["image_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_video_assignments_roving_mic_1_member_id_fkey"
            columns: ["roving_mic_1_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_video_assignments_roving_mic_2_member_id_fkey"
            columns: ["roving_mic_2_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_video_assignments_sound_member_id_fkey"
            columns: ["sound_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_video_assignments_stage_member_id_fkey"
            columns: ["stage_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_assignments: {
        Row: {
          created_at: string | null
          day: number
          id: string
          location: string
          month: number
          publisher1: string
          publisher1_member_id: string | null
          publisher2: string
          publisher2_member_id: string | null
          time: string
          week: number
          weekday: string
          year: number
        }
        Insert: {
          created_at?: string | null
          day: number
          id?: string
          location: string
          month: number
          publisher1: string
          publisher1_member_id?: string | null
          publisher2: string
          publisher2_member_id?: string | null
          time: string
          week: number
          weekday: string
          year: number
        }
        Update: {
          created_at?: string | null
          day?: number
          id?: string
          location?: string
          month?: number
          publisher1?: string
          publisher1_member_id?: string | null
          publisher2?: string
          publisher2_member_id?: string | null
          time?: string
          week?: number
          weekday?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_assignments_publisher1_member_id_fkey"
            columns: ["publisher1_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_assignments_publisher2_member_id_fkey"
            columns: ["publisher2_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      field_service_assignments: {
        Row: {
          category: string
          created_at: string | null
          id: string
          location: string
          month: number
          responsible: string
          responsible_member_id: string | null
          time: string
          weekday: string
          year: number
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          location: string
          month: number
          responsible: string
          responsible_member_id?: string | null
          time: string
          weekday: string
          year: number
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          location?: string
          month?: number
          responsible?: string
          responsible_member_id?: string | null
          time?: string
          weekday?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "field_service_assignments_responsible_member_id_fkey"
            columns: ["responsible_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      field_service_groups: {
        Row: {
          created_at: string | null
          id: string
          name: string
          overseer_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          overseer_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          overseer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_overseer"
            columns: ["overseer_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_assignment_notifications: {
        Row: {
          assignment_date: string | null
          category: string
          confirmed_at: string | null
          created_at: string
          id: string
          is_read: boolean
          member_id: string
          message: string
          read_at: string | null
          revoked_at: string | null
          slot_key: string
          source_id: string
          source_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignment_date?: string | null
          category: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          member_id: string
          message: string
          read_at?: string | null
          revoked_at?: string | null
          slot_key: string
          source_id: string
          source_type: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignment_date?: string | null
          category?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          member_id?: string
          message?: string
          read_at?: string | null
          revoked_at?: string | null
          slot_key?: string
          source_id?: string
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_assignment_notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_privileges: {
        Row: {
          member_id: string
          role: Database["public"]["Enums"]["member_role_enum"]
        }
        Insert: {
          member_id: string
          role: Database["public"]["Enums"]["member_role_enum"]
        }
        Update: {
          member_id?: string
          role?: Database["public"]["Enums"]["member_role_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "member_privileges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          approved_audio_video: boolean | null
          approved_carrinho: boolean | null
          approved_indicadores: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          family_head_id: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_enum"]
          group_id: string | null
          id: string
          is_family_head: boolean | null
          phone: string | null
          spiritual_status:
            | Database["public"]["Enums"]["spiritual_status_enum"]
            | null
        }
        Insert: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          approved_audio_video?: boolean | null
          approved_carrinho?: boolean | null
          approved_indicadores?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          family_head_id?: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_enum"]
          group_id?: string | null
          id?: string
          is_family_head?: boolean | null
          phone?: string | null
          spiritual_status?:
            | Database["public"]["Enums"]["spiritual_status_enum"]
            | null
        }
        Update: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          approved_audio_video?: boolean | null
          approved_carrinho?: boolean | null
          approved_indicadores?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          family_head_id?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_enum"]
          group_id?: string | null
          id?: string
          is_family_head?: boolean | null
          phone?: string | null
          spiritual_status?:
            | Database["public"]["Enums"]["spiritual_status_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "members_family_head_id_fkey"
            columns: ["family_head_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "field_service_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      midweek_christian_life_parts: {
        Row: {
          created_at: string | null
          duration: number
          id: string
          meeting_id: string | null
          part_number: number
          scheduled_time: string | null
          speaker_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          duration: number
          id?: string
          meeting_id?: string | null
          part_number: number
          scheduled_time?: string | null
          speaker_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          duration?: number
          id?: string
          meeting_id?: string | null
          part_number?: number
          scheduled_time?: string | null
          speaker_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "midweek_christian_life_parts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "midweek_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midweek_christian_life_parts_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      midweek_meetings: {
        Row: {
          bible_reading: string | null
          cbs_duration: number | null
          cbs_time: string | null
          cbs_conductor_id: string | null
          cbs_reader_id: string | null
          closing_comments_duration: number | null
          closing_comments_time: string | null
          closing_prayer_id: string | null
          closing_song: number | null
          closing_song_time: string | null
          created_at: string | null
          date: string
          id: string
          middle_song_time: string | null
          middle_song: number | null
          opening_comments_duration: number | null
          opening_comments_time: string | null
          opening_prayer_id: string | null
          opening_song: number | null
          opening_song_time: string | null
          president_id: string | null
          treasure_gems_duration: number | null
          treasure_gems_time: string | null
          treasure_gems_speaker_id: string | null
          treasure_reading_room: string | null
          treasure_reading_duration: number | null
          treasure_reading_time: string | null
          treasure_reading_student_id: string | null
          treasure_talk_duration: number | null
          treasure_talk_time: string | null
          treasure_talk_speaker_id: string | null
          treasure_talk_title: string | null
        }
        Insert: {
          bible_reading?: string | null
          cbs_duration?: number | null
          cbs_time?: string | null
          cbs_conductor_id?: string | null
          cbs_reader_id?: string | null
          closing_comments_duration?: number | null
          closing_comments_time?: string | null
          closing_prayer_id?: string | null
          closing_song?: number | null
          closing_song_time?: string | null
          created_at?: string | null
          date: string
          id?: string
          middle_song_time?: string | null
          middle_song?: number | null
          opening_comments_duration?: number | null
          opening_comments_time?: string | null
          opening_prayer_id?: string | null
          opening_song?: number | null
          opening_song_time?: string | null
          president_id?: string | null
          treasure_gems_duration?: number | null
          treasure_gems_time?: string | null
          treasure_gems_speaker_id?: string | null
          treasure_reading_room?: string | null
          treasure_reading_duration?: number | null
          treasure_reading_time?: string | null
          treasure_reading_student_id?: string | null
          treasure_talk_duration?: number | null
          treasure_talk_time?: string | null
          treasure_talk_speaker_id?: string | null
          treasure_talk_title?: string | null
        }
        Update: {
          bible_reading?: string | null
          cbs_duration?: number | null
          cbs_time?: string | null
          cbs_conductor_id?: string | null
          cbs_reader_id?: string | null
          closing_comments_duration?: number | null
          closing_comments_time?: string | null
          closing_prayer_id?: string | null
          closing_song?: number | null
          closing_song_time?: string | null
          created_at?: string | null
          date?: string
          id?: string
          middle_song_time?: string | null
          middle_song?: number | null
          opening_comments_duration?: number | null
          opening_comments_time?: string | null
          opening_prayer_id?: string | null
          opening_song?: number | null
          opening_song_time?: string | null
          president_id?: string | null
          treasure_gems_duration?: number | null
          treasure_gems_time?: string | null
          treasure_gems_speaker_id?: string | null
          treasure_reading_room?: string | null
          treasure_reading_duration?: number | null
          treasure_reading_time?: string | null
          treasure_reading_student_id?: string | null
          treasure_talk_duration?: number | null
          treasure_talk_time?: string | null
          treasure_talk_speaker_id?: string | null
          treasure_talk_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "midweek_meetings_cbs_conductor_id_fkey"
            columns: ["cbs_conductor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midweek_meetings_cbs_reader_id_fkey"
            columns: ["cbs_reader_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midweek_meetings_closing_prayer_id_fkey"
            columns: ["closing_prayer_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midweek_meetings_opening_prayer_id_fkey"
            columns: ["opening_prayer_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midweek_meetings_president_id_fkey"
            columns: ["president_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midweek_meetings_treasure_gems_speaker_id_fkey"
            columns: ["treasure_gems_speaker_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midweek_meetings_treasure_reading_student_id_fkey"
            columns: ["treasure_reading_student_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midweek_meetings_treasure_talk_speaker_id_fkey"
            columns: ["treasure_talk_speaker_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      midweek_ministry_parts: {
        Row: {
          assistant_id: string | null
          created_at: string | null
          duration: number
          id: string
          meeting_id: string | null
          part_number: number
          room: string | null
          scheduled_time: string | null
          student_id: string | null
          title: string
        }
        Insert: {
          assistant_id?: string | null
          created_at?: string | null
          duration: number
          id?: string
          meeting_id?: string | null
          part_number: number
          room?: string | null
          scheduled_time?: string | null
          student_id?: string | null
          title: string
        }
        Update: {
          assistant_id?: string | null
          created_at?: string | null
          duration?: number
          id?: string
          meeting_id?: string | null
          part_number?: number
          room?: string | null
          scheduled_time?: string | null
          student_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "midweek_ministry_parts_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midweek_ministry_parts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "midweek_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midweek_ministry_parts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          id: string
          member_id: string | null
          system_role: Database["public"]["Enums"]["system_role_enum"]
        }
        Insert: {
          created_at?: string | null
          id: string
          member_id?: string | null
          system_role: Database["public"]["Enums"]["system_role_enum"]
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string | null
          system_role?: Database["public"]["Enums"]["system_role_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      weekend_meetings: {
        Row: {
          closing_prayer_id: string | null
          created_at: string | null
          date: string
          id: string
          president_id: string | null
          talk_congregation: string | null
          talk_speaker_name: string
          talk_theme: string | null
          watchtower_conductor_id: string | null
          watchtower_reader_id: string | null
        }
        Insert: {
          closing_prayer_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          president_id?: string | null
          talk_congregation?: string | null
          talk_speaker_name: string
          talk_theme?: string | null
          watchtower_conductor_id?: string | null
          watchtower_reader_id?: string | null
        }
        Update: {
          closing_prayer_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          president_id?: string | null
          talk_congregation?: string | null
          talk_speaker_name?: string
          talk_theme?: string | null
          watchtower_conductor_id?: string | null
          watchtower_reader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekend_meetings_closing_prayer_id_fkey"
            columns: ["closing_prayer_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekend_meetings_president_id_fkey"
            columns: ["president_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekend_meetings_watchtower_conductor_id_fkey"
            columns: ["watchtower_conductor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekend_meetings_watchtower_reader_id_fkey"
            columns: ["watchtower_reader_id"]
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
      [_ in never]: never
    }
    Enums: {
      gender_enum: "M" | "F"
      member_role_enum: "anciao" | "servo_ministerial"
      spiritual_status_enum:
        | "publicador"
        | "publicador_batizado"
        | "pioneiro_auxiliar"
        | "pioneiro_regular"
        | "estudante"
      system_role_enum:
        | "coordenador"
        | "secretario"
        | "designador"
        | "publicador"
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
      gender_enum: ["M", "F"],
      member_role_enum: ["anciao", "servo_ministerial"],
      spiritual_status_enum: [
        "publicador",
        "publicador_batizado",
        "pioneiro_auxiliar",
        "pioneiro_regular",
        "estudante",
      ],
      system_role_enum: [
        "coordenador",
        "secretario",
        "designador",
        "publicador",
      ],
    },
  },
} as const
