-- ============================================================
-- ScriptArc — Migration 007: Fix RLS Recursion
-- Replaces inline role checks with a SECURITY DEFINER function
-- to prevent infinite recursion on the users table.
-- ============================================================

-- ─── 1. Create a secure function to check mentor status ──────
-- SECURITY DEFINER allows it to run with creator privileges, 
-- bypassing RLS on public.users to prevent the infinite loop.
CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'mentor'
  );
$$;

-- ─── 2. Fix users table policies ────────────────────────────
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR NOT is_private
    OR public.is_mentor()
  );

-- ─── 3. Fix courses table policies ──────────────────────────
DROP POLICY IF EXISTS "courses_mentor_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_mentor_update" ON public.courses;
DROP POLICY IF EXISTS "courses_mentor_delete" ON public.courses;

CREATE POLICY "courses_mentor_insert"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_mentor());

CREATE POLICY "courses_mentor_update"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (public.is_mentor());

CREATE POLICY "courses_mentor_delete"
  ON public.courses FOR DELETE
  TO authenticated
  USING (public.is_mentor());

-- ─── 4. Fix lessons table policies ──────────────────────────
DROP POLICY IF EXISTS "lessons_mentor_insert" ON public.lessons;
DROP POLICY IF EXISTS "lessons_mentor_update" ON public.lessons;
DROP POLICY IF EXISTS "lessons_mentor_delete" ON public.lessons;

CREATE POLICY "lessons_mentor_insert"
  ON public.lessons FOR INSERT
  TO authenticated
  WITH CHECK (public.is_mentor());

CREATE POLICY "lessons_mentor_update"
  ON public.lessons FOR UPDATE
  TO authenticated
  USING (public.is_mentor());

CREATE POLICY "lessons_mentor_delete"
  ON public.lessons FOR DELETE
  TO authenticated
  USING (public.is_mentor());

-- ─── 5. Fix user_progress table policies ────────────────────
DROP POLICY IF EXISTS "user_progress_select_policy" ON public.user_progress;

-- Users can only view their own progress, mentors can view all
CREATE POLICY "user_progress_select_policy"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_mentor()
  );

-- (Insert/Update are already tied purely to auth.uid() = user_id, but it's good to ensure no mentor-bypass relies on the inline query)

-- ─── 6. Fix challenges table policies ───────────────────────
DROP POLICY IF EXISTS "challenges_mentor_insert" ON public.challenges;
DROP POLICY IF EXISTS "challenges_mentor_update" ON public.challenges;
DROP POLICY IF EXISTS "challenges_mentor_delete" ON public.challenges;

CREATE POLICY "challenges_mentor_insert"
  ON public.challenges FOR INSERT
  TO authenticated
  WITH CHECK (public.is_mentor());

CREATE POLICY "challenges_mentor_update"
  ON public.challenges FOR UPDATE
  TO authenticated
  USING (public.is_mentor());

CREATE POLICY "challenges_mentor_delete"
  ON public.challenges FOR DELETE
  TO authenticated
  USING (public.is_mentor());
