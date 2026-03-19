-- Add tracks_data column to playlists to store full track objects for cross-device sync
ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS tracks_data JSONB DEFAULT '[]';
