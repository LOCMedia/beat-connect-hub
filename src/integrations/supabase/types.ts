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
      admin_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          announcement_type: string
          clicks_count: number
          content: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          id: string
          opens_count: number
          recipients_count: number
          scheduled_for: string | null
          sent_at: string | null
          status: string
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type?: string
          clicks_count?: number
          content: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          opens_count?: number
          recipients_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          target_audience?: string
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string
          clicks_count?: number
          content?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          opens_count?: number
          recipients_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          default_commission_percent: number
          id: boolean
          producer_fee_enabled: boolean
          producer_fee_pence: number
          updated_at: string
        }
        Insert: {
          default_commission_percent?: number
          id?: boolean
          producer_fee_enabled?: boolean
          producer_fee_pence?: number
          updated_at?: string
        }
        Update: {
          default_commission_percent?: number
          id?: boolean
          producer_fee_enabled?: boolean
          producer_fee_pence?: number
          updated_at?: string
        }
        Relationships: []
      }
      battle_comments: {
        Row: {
          battle_id: string
          comment: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          battle_id: string
          comment: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          battle_id?: string
          comment?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      beat_analytics: {
        Row: {
          action_type: string
          beat_id: string
          created_at: string
          id: string
          session_id: string | null
        }
        Insert: {
          action_type: string
          beat_id: string
          created_at?: string
          id?: string
          session_id?: string | null
        }
        Update: {
          action_type?: string
          beat_id?: string
          created_at?: string
          id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beat_analytics_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_comments: {
        Row: {
          beat_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          beat_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          beat_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_comments_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_download_requests: {
        Row: {
          admin_note: string | null
          beat_id: string
          created_at: string
          download_expires_at: string | null
          download_url: string | null
          email: string
          full_name: string | null
          id: string
          instagram_handle: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          beat_id: string
          created_at?: string
          download_expires_at?: string | null
          download_url?: string | null
          email: string
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          beat_id?: string
          created_at?: string
          download_expires_at?: string | null
          download_url?: string | null
          email?: string
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beat_download_requests_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_leads: {
        Row: {
          agreed: boolean
          beat_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          instagram_handle: string | null
          user_id: string | null
        }
        Insert: {
          agreed?: boolean
          beat_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          instagram_handle?: string | null
          user_id?: string | null
        }
        Update: {
          agreed?: boolean
          beat_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          instagram_handle?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beat_reactions: {
        Row: {
          beat_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string | null
          voter_id: string | null
        }
        Insert: {
          beat_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id?: string | null
          voter_id?: string | null
        }
        Update: {
          beat_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string | null
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beat_reactions_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      beats: {
        Row: {
          analysis_confidence: Json | null
          analyzed_at: string | null
          audio_url: string
          auto_upload_to_youtube: boolean
          bpm: number
          bpm_detected: number | null
          compare_at_price_pence: number
          cover_image_url: string | null
          created_at: string
          currency: string
          download_count: number
          download_enabled: boolean
          download_type: string | null
          genre: string
          genre_detected: string | null
          id: string
          is_free: boolean
          key: string
          key_detected: string | null
          license_exclusive_price: number
          license_mp3_price: number
          license_stems_price: number
          license_unlimited_price: number
          license_wav_price: number
          mood: string | null
          play_count: number
          preview_audio_url: string | null
          price_pence: number
          require_instagram_follow: boolean
          require_youtube_follow: boolean
          starter_plays: number
          title: string
          updated_at: string
          user_id: string
          youtube_upload_error: string | null
          youtube_upload_status: string
          youtube_video_id: string | null
        }
        Insert: {
          analysis_confidence?: Json | null
          analyzed_at?: string | null
          audio_url: string
          auto_upload_to_youtube?: boolean
          bpm: number
          bpm_detected?: number | null
          compare_at_price_pence?: number
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          download_count?: number
          download_enabled?: boolean
          download_type?: string | null
          genre: string
          genre_detected?: string | null
          id?: string
          is_free?: boolean
          key: string
          key_detected?: string | null
          license_exclusive_price?: number
          license_mp3_price?: number
          license_stems_price?: number
          license_unlimited_price?: number
          license_wav_price?: number
          mood?: string | null
          play_count?: number
          preview_audio_url?: string | null
          price_pence?: number
          require_instagram_follow?: boolean
          require_youtube_follow?: boolean
          starter_plays?: number
          title: string
          updated_at?: string
          user_id: string
          youtube_upload_error?: string | null
          youtube_upload_status?: string
          youtube_video_id?: string | null
        }
        Update: {
          analysis_confidence?: Json | null
          analyzed_at?: string | null
          audio_url?: string
          auto_upload_to_youtube?: boolean
          bpm?: number
          bpm_detected?: number | null
          compare_at_price_pence?: number
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          download_count?: number
          download_enabled?: boolean
          download_type?: string | null
          genre?: string
          genre_detected?: string | null
          id?: string
          is_free?: boolean
          key?: string
          key_detected?: string | null
          license_exclusive_price?: number
          license_mp3_price?: number
          license_stems_price?: number
          license_unlimited_price?: number
          license_wav_price?: number
          mood?: string | null
          play_count?: number
          preview_audio_url?: string | null
          price_pence?: number
          require_instagram_follow?: boolean
          require_youtube_follow?: boolean
          starter_plays?: number
          title?: string
          updated_at?: string
          user_id?: string
          youtube_upload_error?: string | null
          youtube_upload_status?: string
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      challenge_submissions: {
        Row: {
          audio_upload_url: string | null
          challenge_id: string
          created_at: string
          display_name: string | null
          id: string
          notes: string | null
          status: string
          submission_url: string | null
          title: string | null
          updated_at: string
          user_id: string
          video_thumbnail_url: string | null
          video_upload_url: string | null
          votes: number
        }
        Insert: {
          audio_upload_url?: string | null
          challenge_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          notes?: string | null
          status?: string
          submission_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          video_thumbnail_url?: string | null
          video_upload_url?: string | null
          votes?: number
        }
        Update: {
          audio_upload_url?: string | null
          challenge_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          notes?: string | null
          status?: string
          submission_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          video_thumbnail_url?: string | null
          video_upload_url?: string | null
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "sponsored_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "sponsored_challenges_public"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          submission_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          submission_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          submission_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_dm: boolean
          name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_dm?: boolean
          name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_dm?: boolean
          name?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          channel_id: string
          created_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_entries: {
        Row: {
          artist_name: string
          bonus_votes: number
          confirmed_follow: boolean
          contest_id: string
          cover_image_url: string | null
          created_at: string
          freestyle_audio_url: string
          id: string
          instagram: string | null
          sponsor_follow_confirmed: boolean
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
          votes: number
        }
        Insert: {
          artist_name: string
          bonus_votes?: number
          confirmed_follow?: boolean
          contest_id: string
          cover_image_url?: string | null
          created_at?: string
          freestyle_audio_url: string
          id?: string
          instagram?: string | null
          sponsor_follow_confirmed?: boolean
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          votes?: number
        }
        Update: {
          artist_name?: string
          bonus_votes?: number
          confirmed_follow?: boolean
          contest_id?: string
          cover_image_url?: string | null
          created_at?: string
          freestyle_audio_url?: string
          id?: string
          instagram?: string | null
          sponsor_follow_confirmed?: boolean
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_entries_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          archived_at: string | null
          beat_download_url: string | null
          beat_file_url: string | null
          beat_id: string | null
          beat_release_date: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_sponsored: boolean
          preview_audio_url: string | null
          prize_amount: string | null
          prize_description: string | null
          sponsor_instagram: string | null
          sponsor_logo_url: string | null
          sponsor_message: string | null
          sponsor_name: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          beat_download_url?: string | null
          beat_file_url?: string | null
          beat_id?: string | null
          beat_release_date?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_sponsored?: boolean
          preview_audio_url?: string | null
          prize_amount?: string | null
          prize_description?: string | null
          sponsor_instagram?: string | null
          sponsor_logo_url?: string | null
          sponsor_message?: string | null
          sponsor_name?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          beat_download_url?: string | null
          beat_file_url?: string | null
          beat_id?: string | null
          beat_release_date?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_sponsored?: boolean
          preview_audio_url?: string | null
          prize_amount?: string | null
          prize_description?: string | null
          sponsor_instagram?: string | null
          sponsor_logo_url?: string | null
          sponsor_message?: string | null
          sponsor_name?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contests_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      download_logs: {
        Row: {
          downloaded_at: string
          id: string
          ip_address: string | null
          purchase_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          ip_address?: string | null
          purchase_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          ip_address?: string | null
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_logs_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      flash_sales: {
        Row: {
          active: boolean
          beat_id: string
          created_at: string
          discount_percent: number
          end_time: string
          id: string
          original_price: number
          sale_price: number
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          beat_id: string
          created_at?: string
          discount_percent: number
          end_time: string
          id?: string
          original_price?: number
          sale_price?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          beat_id?: string
          created_at?: string
          discount_percent?: number
          end_time?: string
          id?: string
          original_price?: number
          sale_price?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          beat_id: string
          created_at: string
          id: string
          source: string
          status: string
        }
        Insert: {
          beat_id: string
          created_at?: string
          id?: string
          source?: string
          status?: string
        }
        Update: {
          beat_id?: string
          created_at?: string
          id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_exclusive: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_exclusive?: boolean
          name: string
          price: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_exclusive?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          announcement_id: string
          clicked_at: string | null
          created_at: string
          error_message: string | null
          id: string
          opened_at: string | null
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          subscriber_id: string
        }
        Insert: {
          announcement_id: string
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subscriber_id: string
        }
        Update: {
          announcement_id?: string
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "notification_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_subscribers: {
        Row: {
          created_at: string
          email: string
          email_verified: boolean
          form_location: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          phone_number: string | null
          preferences: Json
          source: string
          subscribed_at: string
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
          user_agent: string | null
          verification_token: string
          verified_at: string | null
          whatsapp_opted_in: boolean
        }
        Insert: {
          created_at?: string
          email: string
          email_verified?: boolean
          form_location?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          phone_number?: string | null
          preferences?: Json
          source?: string
          subscribed_at?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_agent?: string | null
          verification_token?: string
          verified_at?: string | null
          whatsapp_opted_in?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          email_verified?: boolean
          form_location?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          phone_number?: string | null
          preferences?: Json
          source?: string
          subscribed_at?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_agent?: string | null
          verification_token?: string
          verified_at?: string | null
          whatsapp_opted_in?: boolean
        }
        Relationships: []
      }
      portfolio_entries: {
        Row: {
          artist_name: string | null
          cover_image_url: string | null
          created_at: string
          credit_text: string | null
          description: string | null
          display_order: number
          entry_type: string
          external_link: string | null
          featured: boolean
          id: string
          release_date: string | null
          title: string
          tracklist: Json | null
          updated_at: string
        }
        Insert: {
          artist_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          credit_text?: string | null
          description?: string | null
          display_order?: number
          entry_type: string
          external_link?: string | null
          featured?: boolean
          id?: string
          release_date?: string | null
          title: string
          tracklist?: Json | null
          updated_at?: string
        }
        Update: {
          artist_name?: string | null
          cover_image_url?: string | null
          created_at?: string
          credit_text?: string | null
          description?: string | null
          display_order?: number
          entry_type?: string
          external_link?: string | null
          featured?: boolean
          id?: string
          release_date?: string | null
          title?: string
          tracklist?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_projects: {
        Row: {
          apple_music_url: string | null
          artist_name: string
          cover_image_url: string | null
          created_at: string
          display_order: number
          featured: boolean
          id: string
          release_date: string | null
          spotify_track_id: string | null
          title: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          apple_music_url?: string | null
          artist_name: string
          cover_image_url?: string | null
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          release_date?: string | null
          spotify_track_id?: string | null
          title: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          apple_music_url?: string | null
          artist_name?: string
          cover_image_url?: string | null
          created_at?: string
          display_order?: number
          featured?: boolean
          id?: string
          release_date?: string | null
          spotify_track_id?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          location: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_paid: number
          beat_id: string
          buyer_email: string
          created_at: string
          download_count: number
          download_expires_at: string
          download_token: string
          id: string
          license_id: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_paid: number
          beat_id: string
          buyer_email: string
          created_at?: string
          download_count?: number
          download_expires_at?: string
          download_token?: string
          id?: string
          license_id: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_paid?: number
          beat_id?: string
          buyer_email?: string
          created_at?: string
          download_count?: number
          download_expires_at?: string
          download_token?: string
          id?: string
          license_id?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_challenges: {
        Row: {
          accent_color: string | null
          beat_upload_url: string | null
          challenge_type: string
          commission_fee: number
          commission_percent: number
          created_at: string
          description: string | null
          duration_days: number
          end_date: string | null
          id: string
          instagram_url: string | null
          preview_audio_url: string | null
          prize_amount: number
          rejection_reason: string | null
          sponsor_call_to_action: string | null
          sponsor_id: string
          sponsor_logo_url: string | null
          start_date: string | null
          status: string
          stripe_payment_intent_id: string | null
          target_link: string
          title: string
          twitter_url: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          beat_upload_url?: string | null
          challenge_type: string
          commission_fee?: number
          commission_percent?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          instagram_url?: string | null
          preview_audio_url?: string | null
          prize_amount?: number
          rejection_reason?: string | null
          sponsor_call_to_action?: string | null
          sponsor_id: string
          sponsor_logo_url?: string | null
          start_date?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          target_link: string
          title: string
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          beat_upload_url?: string | null
          challenge_type?: string
          commission_fee?: number
          commission_percent?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          instagram_url?: string | null
          preview_audio_url?: string | null
          prize_amount?: number
          rejection_reason?: string | null
          sponsor_call_to_action?: string | null
          sponsor_id?: string
          sponsor_logo_url?: string | null
          start_date?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          target_link?: string
          title?: string
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_challenges_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          business_name: string
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_track_purchases: {
        Row: {
          agreed_split_producer: number
          amount_paid: number
          buyer_email: string
          buyer_user_id: string | null
          created_at: string
          download_token: string
          id: string
          payment_ref: string | null
          status: string
          track_id: string
        }
        Insert: {
          agreed_split_producer: number
          amount_paid: number
          buyer_email: string
          buyer_user_id?: string | null
          created_at?: string
          download_token?: string
          id?: string
          payment_ref?: string | null
          status?: string
          track_id: string
        }
        Update: {
          agreed_split_producer?: number
          amount_paid?: number
          buyer_email?: string
          buyer_user_id?: string | null
          created_at?: string
          download_token?: string
          id?: string
          payment_ref?: string | null
          status?: string
          track_id?: string
        }
        Relationships: []
      }
      studio_tracks: {
        Row: {
          artist_credit_suggestion: string | null
          audio_preview_url: string | null
          bpm: number | null
          chorus_lyrics: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          display_order: number
          full_track_url: string | null
          genre: string | null
          id: string
          is_published: boolean
          key: string | null
          price: number
          stems_zip_url: string | null
          suggested_split_producer: number
          title: string
          updated_at: string
        }
        Insert: {
          artist_credit_suggestion?: string | null
          audio_preview_url?: string | null
          bpm?: number | null
          chorus_lyrics?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          full_track_url?: string | null
          genre?: string | null
          id?: string
          is_published?: boolean
          key?: string | null
          price?: number
          stems_zip_url?: string | null
          suggested_split_producer?: number
          title: string
          updated_at?: string
        }
        Update: {
          artist_credit_suggestion?: string | null
          audio_preview_url?: string | null
          bpm?: number | null
          chorus_lyrics?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          full_track_url?: string | null
          genre?: string | null
          id?: string
          is_published?: boolean
          key?: string | null
          price?: number
          stems_zip_url?: string | null
          suggested_split_producer?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tournament_artist_submissions: {
        Row: {
          artist_name: string
          audio_url: string
          beat_id: string | null
          confirmed_follow: boolean
          cover_image_url: string | null
          created_at: string
          id: string
          instagram: string | null
          seed: number | null
          status: string
          tournament_id: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          artist_name: string
          audio_url: string
          beat_id?: string | null
          confirmed_follow?: boolean
          cover_image_url?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          seed?: number | null
          status?: string
          tournament_id: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          artist_name?: string
          audio_url?: string
          beat_id?: string | null
          confirmed_follow?: boolean
          cover_image_url?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          seed?: number | null
          status?: string
          tournament_id?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_artist_submissions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_battle_votes: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          user_id: string | null
          voted_for: string
          voter_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          user_id?: string | null
          voted_for: string
          voter_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
          voted_for?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_battle_votes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "tournament_battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_battle_votes_voted_for_fkey"
            columns: ["voted_for"]
            isOneToOne: false
            referencedRelation: "tournament_artist_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_battles: {
        Row: {
          created_at: string
          id: string
          round: number
          slot: number
          status: string
          submission_a_id: string | null
          submission_b_id: string | null
          tournament_id: string
          updated_at: string
          votes_a: number
          votes_b: number
          voting_closes_at: string | null
          voting_opens_at: string | null
          winner_submission_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          round: number
          slot: number
          status?: string
          submission_a_id?: string | null
          submission_b_id?: string | null
          tournament_id: string
          updated_at?: string
          votes_a?: number
          votes_b?: number
          voting_closes_at?: string | null
          voting_opens_at?: string | null
          winner_submission_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          round?: number
          slot?: number
          status?: string
          submission_a_id?: string | null
          submission_b_id?: string | null
          tournament_id?: string
          updated_at?: string
          votes_a?: number
          votes_b?: number
          voting_closes_at?: string | null
          voting_opens_at?: string | null
          winner_submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_battles_submission_a_id_fkey"
            columns: ["submission_a_id"]
            isOneToOne: false
            referencedRelation: "tournament_artist_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_battles_submission_b_id_fkey"
            columns: ["submission_b_id"]
            isOneToOne: false
            referencedRelation: "tournament_artist_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_battles_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_battles_winner_submission_id_fkey"
            columns: ["winner_submission_id"]
            isOneToOne: false
            referencedRelation: "tournament_artist_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_champion_badges: {
        Row: {
          awarded_at: string
          category: Database["public"]["Enums"]["tournament_category"]
          id: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          category: Database["public"]["Enums"]["tournament_category"]
          id?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          category?: Database["public"]["Enums"]["tournament_category"]
          id?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_champion_badges_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_producer_beats: {
        Row: {
          audio_url: string
          bpm: number | null
          cover_image_url: string | null
          created_at: string
          genre: string | null
          id: string
          instagram: string | null
          is_winner: boolean
          key: string | null
          payment_status: string
          producer_name: string
          status: string
          title: string
          tournament_id: string
          updated_at: string
          user_id: string
          watermark_attested: boolean
        }
        Insert: {
          audio_url: string
          bpm?: number | null
          cover_image_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          instagram?: string | null
          is_winner?: boolean
          key?: string | null
          payment_status?: string
          producer_name: string
          status?: string
          title: string
          tournament_id: string
          updated_at?: string
          user_id: string
          watermark_attested?: boolean
        }
        Update: {
          audio_url?: string
          bpm?: number | null
          cover_image_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          instagram?: string | null
          is_winner?: boolean
          key?: string | null
          payment_status?: string
          producer_name?: string
          status?: string
          title?: string
          tournament_id?: string
          updated_at?: string
          user_id?: string
          watermark_attested?: boolean
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          bracket_size: number
          category: Database["public"]["Enums"]["tournament_category"]
          cover_image_url: string | null
          created_at: string
          current_round: number
          description: string | null
          ends_at: string | null
          id: string
          name: string
          prize_description: string | null
          slug: string
          starts_at: string | null
          status: string
          submission_deadline: string | null
          updated_at: string
          winner_submission_id: string | null
        }
        Insert: {
          bracket_size?: number
          category: Database["public"]["Enums"]["tournament_category"]
          cover_image_url?: string | null
          created_at?: string
          current_round?: number
          description?: string | null
          ends_at?: string | null
          id?: string
          name: string
          prize_description?: string | null
          slug: string
          starts_at?: string | null
          status?: string
          submission_deadline?: string | null
          updated_at?: string
          winner_submission_id?: string | null
        }
        Update: {
          bracket_size?: number
          category?: Database["public"]["Enums"]["tournament_category"]
          cover_image_url?: string | null
          created_at?: string
          current_round?: number
          description?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          prize_description?: string | null
          slug?: string
          starts_at?: string | null
          status?: string
          submission_deadline?: string | null
          updated_at?: string
          winner_submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_winner_fk"
            columns: ["winner_submission_id"]
            isOneToOne: false
            referencedRelation: "tournament_artist_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lyrics: {
        Row: {
          beat_id: string | null
          created_at: string
          id: string
          keywords: string | null
          length_bars: number | null
          lyrics: string
          mood: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          beat_id?: string | null
          created_at?: string
          id?: string
          keywords?: string | null
          length_bars?: number | null
          lyrics: string
          mood?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          beat_id?: string | null
          created_at?: string
          id?: string
          keywords?: string | null
          length_bars?: number | null
          lyrics?: string
          mood?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lyrics_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "contest_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          beat_id: string | null
          converted_to_sale: boolean
          created_at: string
          id: string
          last_message_at: string
          message_history: Json
          phone_number: string
          status: string
        }
        Insert: {
          beat_id?: string | null
          converted_to_sale?: boolean
          created_at?: string
          id?: string
          last_message_at?: string
          message_history?: Json
          phone_number: string
          status?: string
        }
        Update: {
          beat_id?: string | null
          converted_to_sale?: boolean
          created_at?: string
          id?: string
          last_message_at?: string
          message_history?: Json
          phone_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      sponsored_challenges_public: {
        Row: {
          accent_color: string | null
          beat_upload_url: string | null
          challenge_type: string | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          id: string | null
          instagram_url: string | null
          preview_audio_url: string | null
          prize_amount: number | null
          sponsor_call_to_action: string | null
          sponsor_id: string | null
          sponsor_logo_url: string | null
          start_date: string | null
          status: string | null
          target_link: string | null
          title: string | null
          twitter_url: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          beat_upload_url?: string | null
          challenge_type?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string | null
          instagram_url?: string | null
          preview_audio_url?: string | null
          prize_amount?: number | null
          sponsor_call_to_action?: string | null
          sponsor_id?: string | null
          sponsor_logo_url?: string | null
          start_date?: string | null
          status?: string | null
          target_link?: string | null
          title?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          beat_upload_url?: string | null
          challenge_type?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string | null
          instagram_url?: string | null
          preview_audio_url?: string | null
          prize_amount?: number | null
          sponsor_call_to_action?: string | null
          sponsor_id?: string | null
          sponsor_logo_url?: string | null
          start_date?: string | null
          status?: string | null
          target_link?: string | null
          title?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_challenges_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_tracks_public: {
        Row: {
          artist_credit_suggestion: string | null
          audio_preview_url: string | null
          bpm: number | null
          chorus_lyrics: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          genre: string | null
          id: string | null
          is_published: boolean | null
          key: string | null
          price: number | null
          suggested_split_producer: number | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          artist_credit_suggestion?: string | null
          audio_preview_url?: string | null
          bpm?: number | null
          chorus_lyrics?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          genre?: string | null
          id?: string | null
          is_published?: boolean | null
          key?: string | null
          price?: number | null
          suggested_split_producer?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_credit_suggestion?: string | null
          audio_preview_url?: string | null
          bpm?: number | null
          chorus_lyrics?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          genre?: string | null
          id?: string | null
          is_published?: boolean | null
          key?: string | null
          price?: number | null
          suggested_split_producer?: number | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_admin_notification_subscribers: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_verified: boolean
          form_location: string
          id: string
          is_active: boolean
          phone_number: string
          preferences: Json
          source: string
          subscribed_at: string
          unsubscribed_at: string
          updated_at: string
          whatsapp_opted_in: boolean
        }[]
      }
      get_or_create_dm_channel: {
        Args: { _other_user: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_beat_download: {
        Args: { _beat_id: string }
        Returns: undefined
      }
      increment_play_count: { Args: { _beat_id: string }; Returns: undefined }
      is_chat_participant: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      submit_challenge_for_review: {
        Args: { _challenge_id: string; _payment_ref: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "sponsor"
      tournament_category: "acapella" | "beat_freestyle"
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
      app_role: ["admin", "user", "sponsor"],
      tournament_category: ["acapella", "beat_freestyle"],
    },
  },
} as const
