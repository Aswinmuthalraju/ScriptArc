-- ============================================================
-- ScriptArc — Migration 006: RLS for Lessons & Progress
-- Adds Row Level Security policies for tables introduced in 005
-- ============================================================

-- Enable RLS on the new tables
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- LESSONS POLICIES
-- Anyone authenticated can view lessons
CREATE POLICY "lessons_select_all"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (true);

-- Only mentors can manage lessons
CREATE POLICY "lessons_mentor_insert"
  ON public.lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

CREATE POLICY "lessons_mentor_update"
  ON public.lessons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

CREATE POLICY "lessons_mentor_delete"
  ON public.lessons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

-- USER PROGRESS POLICIES
-- Users can only view their own progress, mentors can view all
CREATE POLICY "user_progress_select_policy"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'mentor'
    )
  );

-- Users can insert and update their own progress
CREATE POLICY "user_progress_insert_own"
  ON public.user_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_progress_update_own"
  ON public.user_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
