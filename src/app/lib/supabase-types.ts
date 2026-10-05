export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          attendants: string[]
          attendants_member_ids: string[]
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
          attendants?: string[]
          attendants_member_ids?: string[]
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
          attendants?: string[]
          attendants_member_ids?: string[]
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
          location?: string
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
      field_service_group_assistants: {
        Row: {
          group_id: string
          member_id: string
        }
        Insert: {
          group_id: string
          member_id: string
        }
        Update: {
          group_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_service_group_assistants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "field_service_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_service_group_assistants_member_id_fkey"
            columns: ["member_id"]
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
          assignment_revision: string | null
          assignment_snapshot: Json | null
          decline_reason: string | null
          hidden_at: string | null
          responded_at: string | null
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
          assignment_revision?: string | null
          assignment_snapshot?: Json | null
          decline_reason?: string | null
          hidden_at?: string | null
          responded_at?: string | null
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
          assignment_revision?: string | null
          assignment_snapshot?: Json | null
          decline_reason?: string | null
          hidden_at?: string | null
          responded_at?: string | null
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
      member_transfer_assignment_audit: {
        Row: {
          assignment_date: string
          created_at: string
          details: string | null
          id: string
          member_id: string
          member_name: string
          role_label: string
          slot_key: string
          source: string
          source_id: string
          source_type: string
          transfer_id: string
        }
        Insert: {
          assignment_date: string
          created_at?: string
          details?: string | null
          id?: string
          member_id: string
          member_name: string
          role_label: string
          slot_key: string
          source: string
          source_id: string
          source_type: string
          transfer_id: string
        }
        Update: {
          assignment_date?: string
          created_at?: string
          details?: string | null
          id?: string
          member_id?: string
          member_name?: string
          role_label?: string
          slot_key?: string
          source?: string
          source_id?: string
          source_type?: string
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_transfer_assignment_audit_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_transfer_assignment_audit_transfer_member_fkey"
            columns: ["transfer_id", "member_id"]
            isOneToOne: false
            referencedRelation: "member_transfers"
            referencedColumns: ["id", "member_id"]
          },
        ]
      }
      member_transfers: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          destination_congregation: string | null
          id: string
          member_id: string
          previous_group_id: string | null
          previous_profile_is_active: boolean
          previous_spiritual_status:
            | Database["public"]["Enums"]["spiritual_status_enum"]
            | null
          transferred_at: string
          transferred_by: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          destination_congregation?: string | null
          id?: string
          member_id: string
          previous_group_id?: string | null
          previous_profile_is_active: boolean
          previous_spiritual_status?:
            | Database["public"]["Enums"]["spiritual_status_enum"]
            | null
          transferred_at: string
          transferred_by: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          destination_congregation?: string | null
          id?: string
          member_id?: string
          previous_group_id?: string | null
          previous_profile_is_active?: boolean
          previous_spiritual_status?:
            | Database["public"]["Enums"]["spiritual_status_enum"]
            | null
          transferred_at?: string
          transferred_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_transfers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_transfers_previous_group_id_fkey"
            columns: ["previous_group_id"]
            isOneToOne: false
            referencedRelation: "field_service_groups"
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
          approved_demonstracao: boolean
          approved_discurso_publico: boolean
          approved_discurso_sala: boolean
          approved_estudo_biblico: boolean
          approved_image: boolean
          approved_indicadores: boolean | null
          approved_leitor_atalaia: boolean
          approved_leitor_estudo_biblico: boolean
          approved_leitura_biblica: boolean
          approved_oracao: boolean
          approved_pioneiro_auxiliar: boolean | null
          approved_pioneiro_regular: boolean | null
          approved_presidente_reuniao: boolean
          approved_roving_mic: boolean
          approved_sound: boolean
          approved_stage: boolean
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
          approved_demonstracao?: boolean
          approved_discurso_publico?: boolean
          approved_discurso_sala?: boolean
          approved_estudo_biblico?: boolean
          approved_image?: boolean
          approved_indicadores?: boolean | null
          approved_leitor_atalaia?: boolean
          approved_leitor_estudo_biblico?: boolean
          approved_leitura_biblica?: boolean
          approved_oracao?: boolean
          approved_pioneiro_auxiliar?: boolean | null
          approved_pioneiro_regular?: boolean | null
          approved_presidente_reuniao?: boolean
          approved_roving_mic?: boolean
          approved_sound?: boolean
          approved_stage?: boolean
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
          approved_demonstracao?: boolean
          approved_discurso_publico?: boolean
          approved_discurso_sala?: boolean
          approved_estudo_biblico?: boolean
          approved_image?: boolean
          approved_indicadores?: boolean | null
          approved_leitor_atalaia?: boolean
          approved_leitor_estudo_biblico?: boolean
          approved_leitura_biblica?: boolean
          approved_oracao?: boolean
          approved_pioneiro_auxiliar?: boolean | null
          approved_pioneiro_regular?: boolean | null
          approved_presidente_reuniao?: boolean
          approved_roving_mic?: boolean
          approved_sound?: boolean
          approved_stage?: boolean
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
          cbs_conductor_id: string | null
          cbs_duration: number | null
          cbs_reader_id: string | null
          cbs_time: string | null
          closing_comments_duration: number | null
          closing_comments_time: string | null
          closing_prayer_id: string | null
          closing_song: number | null
          closing_song_time: string | null
          created_at: string | null
          date: string
          id: string
          middle_song: number | null
          middle_song_time: string | null
          opening_comments_duration: number | null
          opening_comments_time: string | null
          opening_prayer_id: string | null
          opening_song: number | null
          opening_song_time: string | null
          president_id: string | null
          treasure_gems_duration: number | null
          treasure_gems_speaker_id: string | null
          treasure_gems_time: string | null
          treasure_reading_duration: number | null
          treasure_reading_room: string | null
          treasure_reading_student_id: string | null
          treasure_reading_time: string | null
          treasure_talk_duration: number | null
          treasure_talk_speaker_id: string | null
          treasure_talk_time: string | null
          treasure_talk_title: string | null
        }
        Insert: {
          bible_reading?: string | null
          cbs_conductor_id?: string | null
          cbs_duration?: number | null
          cbs_reader_id?: string | null
          cbs_time?: string | null
          closing_comments_duration?: number | null
          closing_comments_time?: string | null
          closing_prayer_id?: string | null
          closing_song?: number | null
          closing_song_time?: string | null
          created_at?: string | null
          date: string
          id?: string
          middle_song?: number | null
          middle_song_time?: string | null
          opening_comments_duration?: number | null
          opening_comments_time?: string | null
          opening_prayer_id?: string | null
          opening_song?: number | null
          opening_song_time?: string | null
          president_id?: string | null
          treasure_gems_duration?: number | null
          treasure_gems_speaker_id?: string | null
          treasure_gems_time?: string | null
          treasure_reading_duration?: number | null
          treasure_reading_room?: string | null
          treasure_reading_student_id?: string | null
          treasure_reading_time?: string | null
          treasure_talk_duration?: number | null
          treasure_talk_speaker_id?: string | null
          treasure_talk_time?: string | null
          treasure_talk_title?: string | null
        }
        Update: {
          bible_reading?: string | null
          cbs_conductor_id?: string | null
          cbs_duration?: number | null
          cbs_reader_id?: string | null
          cbs_time?: string | null
          closing_comments_duration?: number | null
          closing_comments_time?: string | null
          closing_prayer_id?: string | null
          closing_song?: number | null
          closing_song_time?: string | null
          created_at?: string | null
          date?: string
          id?: string
          middle_song?: number | null
          middle_song_time?: string | null
          opening_comments_duration?: number | null
          opening_comments_time?: string | null
          opening_prayer_id?: string | null
          opening_song?: number | null
          opening_song_time?: string | null
          president_id?: string | null
          treasure_gems_duration?: number | null
          treasure_gems_speaker_id?: string | null
          treasure_gems_time?: string | null
          treasure_reading_duration?: number | null
          treasure_reading_room?: string | null
          treasure_reading_student_id?: string | null
          treasure_reading_time?: string | null
          treasure_talk_duration?: number | null
          treasure_talk_speaker_id?: string | null
          treasure_talk_time?: string | null
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
      personal_field_records: {
        Row: {
          bible_studies: number
          created_at: string | null
          date: string
          hours: number
          id: string
          notes: string | null
          publications: number
          return_visits: number
          updated_at: string | null
          user_id: string
          videos: number
        }
        Insert: {
          bible_studies?: number
          created_at?: string | null
          date: string
          hours?: number
          id?: string
          notes?: string | null
          publications?: number
          return_visits?: number
          updated_at?: string | null
          user_id: string
          videos?: number
        }
        Update: {
          bible_studies?: number
          created_at?: string | null
          date?: string
          hours?: number
          id?: string
          notes?: string | null
          publications?: number
          return_visits?: number
          updated_at?: string | null
          user_id?: string
          videos?: number
        }
        Relationships: []
      }
      personal_goal_planner_month_items: {
        Row: {
          activity_type: string
          client_id: string
          created_at: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          month: number
          note: string | null
          planned_date: string
          position: number
          source_type: string
          start_time: string
          template_origin_client_id: string | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          activity_type: string
          client_id: string
          created_at?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          month: number
          note?: string | null
          planned_date: string
          position?: number
          source_type: string
          start_time: string
          template_origin_client_id?: string | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          activity_type?: string
          client_id?: string
          created_at?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          month?: number
          note?: string | null
          planned_date?: string
          position?: number
          source_type?: string
          start_time?: string
          template_origin_client_id?: string | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      personal_goal_planner_template: {
        Row: {
          activity_type: string
          client_id: string
          created_at: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          note: string | null
          position: number
          start_time: string
          updated_at: string | null
          user_id: string
          weekday: number
        }
        Insert: {
          activity_type: string
          client_id: string
          created_at?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          note?: string | null
          position?: number
          start_time: string
          updated_at?: string | null
          user_id: string
          weekday: number
        }
        Update: {
          activity_type?: string
          client_id?: string
          created_at?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          note?: string | null
          position?: number
          start_time?: string
          updated_at?: string | null
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      personal_monthly_goals: {
        Row: {
          created_at: string | null
          hours_goal: number
          id: string
          month: number
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          hours_goal?: number
          id?: string
          month: number
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          hours_goal?: number
          id?: string
          month?: number
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      personal_return_visits: {
        Row: {
          address: string | null
          bible_text: string | null
          created_at: string | null
          deactivated_at: string | null
          deactivation_reason: string | null
          id: string
          is_active: boolean
          name_or_initials: string | null
          next_step: string | null
          phone: string | null
          return_date: string | null
          status: Database["public"]["Enums"]["return_visit_status_enum"]
          topic: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          bible_text?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          id?: string
          is_active?: boolean
          name_or_initials?: string | null
          next_step?: string | null
          phone?: string | null
          return_date?: string | null
          status?: Database["public"]["Enums"]["return_visit_status_enum"]
          topic?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          bible_text?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          id?: string
          is_active?: boolean
          name_or_initials?: string | null
          next_step?: string | null
          phone?: string | null
          return_date?: string | null
          status?: Database["public"]["Enums"]["return_visit_status_enum"]
          topic?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      personal_spiritual_journal: {
        Row: {
          content: string
          created_at: string | null
          entry_type: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          entry_type?: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          entry_type?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      personal_territory_logs: {
        Row: {
          approximate_address: string | null
          created_at: string | null
          date_worked: string
          id: string
          lat: number | null
          lng: number | null
          name: string | null
          notes: string | null
          street_area: string | null
          territory_type: Database["public"]["Enums"]["territory_type_enum"]
          time_spent_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approximate_address?: string | null
          created_at?: string | null
          date_worked: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string | null
          notes?: string | null
          street_area?: string | null
          territory_type?: Database["public"]["Enums"]["territory_type_enum"]
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approximate_address?: string | null
          created_at?: string | null
          date_worked?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string | null
          notes?: string | null
          street_area?: string | null
          territory_type?: Database["public"]["Enums"]["territory_type_enum"]
          time_spent_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_create_assignments: boolean
          can_create_members: boolean
          can_download_assignment_image: boolean
          can_download_assignment_pdf: boolean
          can_edit_assignments: boolean
          can_edit_members: boolean
          can_manage_permissions: boolean
          can_view_assignments: boolean
          can_view_meetings: boolean
          can_view_members: boolean
          can_view_reports: boolean
          role: Database["public"]["Enums"]["system_role_enum"]
          updated_at: string
        }
        Insert: {
          can_create_assignments?: boolean
          can_create_members?: boolean
          can_download_assignment_image?: boolean
          can_download_assignment_pdf?: boolean
          can_edit_assignments?: boolean
          can_edit_members?: boolean
          can_manage_permissions?: boolean
          can_view_assignments?: boolean
          can_view_meetings?: boolean
          can_view_members?: boolean
          can_view_reports?: boolean
          role: Database["public"]["Enums"]["system_role_enum"]
          updated_at?: string
        }
        Update: {
          can_create_assignments?: boolean
          can_create_members?: boolean
          can_download_assignment_image?: boolean
          can_download_assignment_pdf?: boolean
          can_edit_assignments?: boolean
          can_edit_members?: boolean
          can_manage_permissions?: boolean
          can_view_assignments?: boolean
          can_view_meetings?: boolean
          can_view_members?: boolean
          can_view_reports?: boolean
          role?: Database["public"]["Enums"]["system_role_enum"]
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          member_id: string | null
          system_role: Database["public"]["Enums"]["system_role_enum"]
        }
        Insert: {
          created_at?: string | null
          id: string
          is_active?: boolean
          member_id?: string | null
          system_role: Database["public"]["Enums"]["system_role_enum"]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
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
          closing_prayer_name: string | null
          created_at: string | null
          date: string
          id: string
          president_id: string | null
          superintendent_discourse_speaker: string | null
          superintendent_discourse_theme: string | null
          superintendent_visit: boolean | null
          talk_congregation: string | null
          talk_speaker_name: string
          talk_theme: string | null
          watchtower_conductor_id: string | null
          watchtower_reader_id: string | null
        }
        Insert: {
          closing_prayer_id?: string | null
          closing_prayer_name?: string | null
          created_at?: string | null
          date: string
          id?: string
          president_id?: string | null
          superintendent_discourse_speaker?: string | null
          superintendent_discourse_theme?: string | null
          superintendent_visit?: boolean | null
          talk_congregation?: string | null
          talk_speaker_name: string
          talk_theme?: string | null
          watchtower_conductor_id?: string | null
          watchtower_reader_id?: string | null
        }
        Update: {
          closing_prayer_id?: string | null
          closing_prayer_name?: string | null
          created_at?: string | null
          date?: string
          id?: string
          president_id?: string | null
          superintendent_discourse_speaker?: string | null
          superintendent_discourse_theme?: string | null
          superintendent_visit?: boolean | null
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
      respond_to_meeting_assignment: {
        Args: {
          p_notification_id: string
          p_revision: string
          p_decision: string
          p_reason?: string | null
        }
        Returns: Json
      }
      admin_reset_user_password: {
        Args: {
          target_auth_id: string
          target_member_id: string
          temp_password: string
        }
        Returns: boolean
      }
      cancel_member_transfer: {
        Args: { p_transfer_id: string }
        Returns: undefined
      }
      get_midweek_meetings_schedule: { Args: never; Returns: Json }
      get_my_access_status: { Args: never; Returns: boolean }
      get_weekend_meetings_schedule: { Args: never; Returns: Json }
      has_role_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      preview_member_transfer: {
        Args: { p_member_id: string }
        Returns: Database["public"]["CompositeTypes"]["member_transfer_impact"]
        SetofOptions: {
          from: "*"
          to: "member_transfer_impact"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transfer_member: {
        Args: {
          p_destination_congregation?: string
          p_member_id: string
          p_transferred_at: string
        }
        Returns: {
          removed_assignment_count: number
          transfer_id: string
        }[]
      }
      update_member_system_role: {
        Args: { p_member_id: string; p_role: string }
        Returns: undefined
      }
      update_role_permission: {
        Args: { p_perm: string; p_role: string; p_value: boolean }
        Returns: undefined
      }
    }
    Enums: {
      gender_enum: "M" | "F"
      member_role_enum: "anciao" | "servo_ministerial"
      return_visit_status_enum: "ativa" | "estudo_iniciado" | "encerrada"
      spiritual_status_enum:
        | "publicador"
        | "publicador_batizado"
        | "pioneiro_auxiliar"
        | "pioneiro_regular"
        | "estudante"
        | "servo_ministerial"
        | "anciao"
        | "desassociado"
        | "inativo"
      system_role_enum:
        | "coordenador"
        | "secretario"
        | "designador"
        | "publicador"
      territory_type_enum: "residencial" | "comercial" | "rural" | "publico"
    }
    CompositeTypes: {
      member_transfer_impact: {
        future_assignment_count: number | null
      }
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
      return_visit_status_enum: ["ativa", "estudo_iniciado", "encerrada"],
      spiritual_status_enum: [
        "publicador",
        "publicador_batizado",
        "pioneiro_auxiliar",
        "pioneiro_regular",
        "estudante",
        "servo_ministerial",
        "anciao",
        "desassociado",
        "inativo",
      ],
      system_role_enum: [
        "coordenador",
        "secretario",
        "designador",
        "publicador",
      ],
      territory_type_enum: ["residencial", "comercial", "rural", "publico"],
    },
  },
} as const
