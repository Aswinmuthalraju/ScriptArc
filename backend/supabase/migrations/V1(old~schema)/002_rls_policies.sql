-- ============================================================
-- ScriptArc — Row Level Security Policies
-- Migration 002: RLS
-- ============================================================

-- Enable RLS on every table
ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS POLICIES
-- ============================================================

-- SELECT: public profiles visible to everyone who is authenticated,
--         private profiles visible only to the owner or mentors.
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    -- Always let users see their own profile
    auth.uid() = id
    -- Non-private users are visible to everyone
    OR NOT is_private
    -- Mentors can see all profiles (including private)
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

-- UPDATE: users can only update their own profile
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: handled by the trigger; no direct inserts from clients
CREATE POLICY "users_insert_via_trigger"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- COURSES POLICIES
-- ============================================================

-- Anyone authenticated can browse courses
CREATE POLICY "courses_select_all"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

-- Only mentors can create / update / delete courses
CREATE POLICY "courses_mentor_insert"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

CREATE POLICY "courses_mentor_update"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

CREATE POLICY "courses_mentor_delete"
  ON public.courses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

-- ============================================================
-- CHALLENGES POLICIES
-- ============================================================

-- Anyone authenticated can view challenges
CREATE POLICY "challenges_select_all"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (true);

-- Only mentors can manage challenges
CREATE POLICY "challenges_mentor_insert"
  ON public.challenges FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

CREATE POLICY "challenges_mentor_update"
  ON public.challenges FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

CREATE POLICY "challenges_mentor_delete"
  ON public.challenges FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

-- ============================================================
-- SUBMISSIONS POLICIES
-- ============================================================

-- SELECT: students see their own, mentors see all
CREATE POLICY "submissions_select_policy"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

-- INSERT: students can only insert their own submissions
CREATE POLICY "submissions_insert_own"
  ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
