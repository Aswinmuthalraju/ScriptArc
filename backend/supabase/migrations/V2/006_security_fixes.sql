-- ============================================================
-- ScriptArc — Supabase PostgreSQL Schema (V2)
-- Migration 006: Security & Integrity Fixes
-- ============================================================
-- Run this in the Supabase SQL Editor after 005_mentor_system.sql.
-- All statements are idempotent (safe to re-run).
-- ============================================================


-- ============================================================
-- 1. FIX RLS: Course/Lesson/Challenge write access must be
--    admin-only. Mentors were incorrectly granted INSERT/UPDATE/DELETE.
-- ============================================================

-- Drop the overly-permissive mentor write policies
DROP POLICY IF EXISTS "courses_mentor_insert"    ON public.courses;
DROP POLICY IF EXISTS "courses_mentor_update"    ON public.courses;
DROP POLICY IF EXISTS "courses_mentor_delete"    ON public.courses;
DROP POLICY IF EXISTS "lessons_mentor_insert"    ON public.lessons;
DROP POLICY IF EXISTS "lessons_mentor_update"    ON public.lessons;
DROP POLICY IF EXISTS "lessons_mentor_delete"    ON public.lessons;
DROP POLICY IF EXISTS "challenges_mentor_insert" ON public.challenges;
DROP POLICY IF EXISTS "challenges_mentor_update" ON public.challenges;
DROP POLICY IF EXISTS "challenges_mentor_delete" ON public.challenges;

-- Replace with admin-only write policies
CREATE POLICY "courses_admin_insert"    ON public.courses    FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "courses_admin_update"    ON public.courses    FOR UPDATE TO authenticated USING    (public.is_admin());
CREATE POLICY "courses_admin_delete"    ON public.courses    FOR DELETE TO authenticated USING    (public.is_admin());

CREATE POLICY "lessons_admin_insert"    ON public.lessons    FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "lessons_admin_update"    ON public.lessons    FOR UPDATE TO authenticated USING    (public.is_admin());
CREATE POLICY "lessons_admin_delete"    ON public.lessons    FOR DELETE TO authenticated USING    (public.is_admin());

CREATE POLICY "challenges_admin_insert" ON public.challenges FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "challenges_admin_update" ON public.challenges FOR UPDATE TO authenticated USING    (public.is_admin());
CREATE POLICY "challenges_admin_delete" ON public.challenges FOR DELETE TO authenticated USING    (public.is_admin());


-- ============================================================
-- 2. PREVENT DUPLICATE SUBMISSIONS
--    A user can only have one submission per challenge.
--    Prevents double-click double-points exploit.
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.submissions
    ADD CONSTRAINT unique_user_challenge UNIQUE (user_id, challenge_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 3. ENFORCE VALID CHALLENGE TYPES
--    Rejects any insertion with a type other than 'mcq' or 'coding'.
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.challenges
    ADD CONSTRAINT valid_challenge_type CHECK (challenge_type IN ('mcq', 'coding'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 4. PERFORMANCE INDEX: user_progress lookup by (user, lesson)
--    The most common RLS + application query pattern.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_progress_user_lesson
  ON public.user_progress (user_id, lesson_id);


-- ============================================================
-- 5. ADD updated_at TO CORE TABLES
--    Enables audit trails and debugging.
-- ============================================================
ALTER TABLE public.users         ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.courses       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.lessons       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.challenges    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Auto-update trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_mentor_profiles_updated_at
  BEFORE UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 6. IMPROVE MENTOR CODE GENERATION
--    Old: MNTR-XXXX (4-digit, 10k space, collision-prone at scale)
--    New: MNTR-XXXXXXXX (8-char hex, 4.3 billion space, retry loop)
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_mentor_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_code     TEXT;
  v_attempts INT := 0;
BEGIN
  IF NEW.status = 'approved'
     AND (OLD.status IS DISTINCT FROM 'approved')
     AND NEW.mentor_code IS NULL
  THEN
    LOOP
      -- 8-char uppercase hex prefix → 4,294,967,296 unique codes
      v_code := 'MNTR-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.mentor_profiles WHERE mentor_code = v_code
      );
      v_attempts := v_attempts + 1;
      IF v_attempts > 20 THEN
        RAISE EXCEPTION 'assign_mentor_code: could not generate a unique code after 20 attempts';
      END IF;
    END LOOP;
    NEW.mentor_code := v_code;
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Re-create the trigger (function replacement is in place, trigger body unchanged)
DROP TRIGGER IF EXISTS trg_assign_mentor_code ON public.mentor_profiles;
CREATE TRIGGER trg_assign_mentor_code
  BEFORE UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_mentor_code();
