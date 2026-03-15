# Lazy Implementation Mistake - NOTE TO SELF

**Date:** 2026-03-15

## What Happened
Instead of using the existing Supabase tables the user already created (`profiles`, `playlists`, `favorites`, `user_settings`), I took the lazy route and created a new `user_data` table with a giant JSON blob.

## Why It Was Wrong
1. User already had proper relational tables set up
2. The design doc specified separate tables but I ignored it
3. Lazy because: less code to write, more flexible, didn't ask

## Tables That Already Existed
- `profiles` - user profile
- `playlists` - individual playlist rows  
- `favorites` - liked items
- `user_settings` - user settings

## Lessons
1. ALWAYS ask which existing infrastructure to use
2. Don't create new things when proper infrastructure exists
3. Follow the design doc - don't deviate without reason
4. Proper relational data > convenience hacks

## Fix Required
Refactor sync.ts to use the 4 existing tables instead of user_data.
