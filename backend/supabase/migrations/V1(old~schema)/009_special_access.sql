-- ============================================================
-- ScriptArc — Migration 009: Special Access flag
-- Adds a has_special_access column to users.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS has_special_access boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.has_special_access
  IS 'When true, all content locks (lessons, video seek, challenges) are bypassed — used for internal testing';

-- NOTE: To grant special access to a specific account, run the following
-- one-off statement in the Supabase SQL Editor (do NOT add it to migrations):
--
--   UPDATE public.users
--   SET has_special_access = true
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com' LIMIT 1);
 UPDATE public.users
  SET has_special_access = true
  WHERE id = (
    SELECT id FROM auth.users WHERE email = 'aswin27dev@gmail.com' LIMIT 1
  );