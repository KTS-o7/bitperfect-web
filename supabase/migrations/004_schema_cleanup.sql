-- supabase/migrations/004_schema_cleanup.sql
-- Schema cleanup: remove unused columns, fix defaults, add color to playlists

BEGIN;

-- ── playlists ──────────────────────────────────────────────────────────────

-- Add color column (was local-only, now synced)
ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Remove redundant track_ids column (tracks_data carries everything)
ALTER TABLE public.playlists
  DROP COLUMN IF EXISTS track_ids;

-- Backfill: ensure tracks_data is never null
UPDATE public.playlists
  SET tracks_data = '[]'
  WHERE tracks_data IS NULL;

-- Make tracks_data NOT NULL now that nulls are cleared
ALTER TABLE public.playlists
  ALTER COLUMN tracks_data SET NOT NULL,
  ALTER COLUMN tracks_data SET DEFAULT '[]';

-- ── listening_history ──────────────────────────────────────────────────────

-- Remove listened_at column (it recorded sync time, not listen time — misleading)
ALTER TABLE public.listening_history
  DROP COLUMN IF EXISTS listened_at;

-- ── user_settings ──────────────────────────────────────────────────────────

-- Remove hardcoded columns that are never read back by the app
ALTER TABLE public.user_settings
  DROP COLUMN IF EXISTS theme,
  DROP COLUMN IF EXISTS auto_play,
  DROP COLUMN IF EXISTS crossfade_seconds;

-- Fix audio_quality default casing (schema said 'high', app writes 'LOSSLESS')
ALTER TABLE public.user_settings
  ALTER COLUMN audio_quality SET DEFAULT 'LOSSLESS';

-- Normalise existing lowercase values to uppercase
UPDATE public.user_settings
  SET audio_quality = UPPER(audio_quality)
  WHERE audio_quality IN ('low', 'high');

-- ── favorites ──────────────────────────────────────────────────────────────

-- Tighten type constraint to only what the app actually uses
ALTER TABLE public.favorites
  DROP CONSTRAINT IF EXISTS favorites_type_check;

ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_type_check
  CHECK (type IN ('album', 'track'));

-- Remove any orphaned 'artist' or 'playlist' type rows
DELETE FROM public.favorites
  WHERE type IN ('artist', 'playlist');

COMMIT;
