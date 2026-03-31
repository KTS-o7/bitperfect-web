// apps/web/lib/supabase/database.types.ts
// Generated from Supabase - run: supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      playlists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          cover_url: string | null
          color: string | null
          tracks_data: Json
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          cover_url?: string | null
          color?: string | null
          tracks_data?: Json | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          cover_url?: string | null
          color?: string | null
          tracks_data?: Json | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          type: 'album' | 'track'
          item_id: string
          item_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'album' | 'track'
          item_id: string
          item_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'album' | 'track'
          item_id?: string
          item_data?: Json | null
          created_at?: string
        }
      }
      listening_history: {
        Row: {
          id: string
          user_id: string
          track_id: string
          track_data: Json
        }
        Insert: {
          id?: string
          user_id: string
          track_id: string
          track_data: Json
        }
        Update: {
          id?: string
          user_id?: string
          track_id?: string
          track_data?: Json
        }
      }
      user_settings: {
        Row: {
          user_id: string
          audio_quality: string
          settings_json: Json
          updated_at: string
        }
        Insert: {
          user_id: string
          audio_quality?: string
          settings_json?: Json
          updated_at?: string
        }
        Update: {
          user_id?: string
          audio_quality?: string
          settings_json?: Json
          updated_at?: string
        }
      }
    }
  }
}
