-- ============================================================
-- Migration 008: Add avatar_id to users
-- ============================================================

ALTER TABLE public.users
ADD COLUMN avatar_id integer DEFAULT 1;

COMMENT ON COLUMN public.users.avatar_id IS 'ID of the avatar chosen in the AvatarPicker component';
