-- ============================================================
-- ScriptArc — Supabase PostgreSQL Schema (V2)
-- Migration 011: Course-based mentor system
-- ============================================================
-- Run after 010_messaging_fix.sql.
-- All statements are idempotent (safe to re-run).
-- ============================================================

-- ── 1. mentor_courses — which courses each mentor teaches ──────
-- Allows one mentor → many courses and one course → many mentors.
CREATE TABLE IF NOT EXISTS public.mentor_courses (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id  uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_courses_mentor ON public.mentor_courses(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_courses_course ON public.mentor_courses(course_id);

ALTER TABLE public.mentor_courses ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (students need to validate during assignment)
DROP POLICY IF EXISTS "mc_select" ON public.mentor_courses;
CREATE POLICY "mc_select"
  ON public.mentor_courses FOR SELECT TO authenticated
  USING (true);

-- Only approved mentors can manage their own course list
DROP POLICY IF EXISTS "mc_mentor_insert" ON public.mentor_courses;
CREATE POLICY "mc_mentor_insert"
  ON public.mentor_courses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = mentor_id AND public.is_mentor());

DROP POLICY IF EXISTS "mc_mentor_delete" ON public.mentor_courses;
CREATE POLICY "mc_mentor_delete"
  ON public.mentor_courses FOR DELETE TO authenticated
  USING (auth.uid() = mentor_id OR public.is_admin());

-- ── 2. Update mentor_students unique constraint ─────────────────
-- Old: UNIQUE(mentor_id, student_id)   — blocks same student+mentor in 2 courses
-- New: UNIQUE(mentor_id, student_id, course_id) — allows multi-course connections
ALTER TABLE public.mentor_students
  DROP CONSTRAINT IF EXISTS mentor_students_mentor_id_student_id_key;

ALTER TABLE public.mentor_students
  DROP CONSTRAINT IF EXISTS mentor_students_mentor_student_course_unique;

ALTER TABLE public.mentor_students
  ADD CONSTRAINT mentor_students_mentor_student_course_unique
  UNIQUE(mentor_id, student_id, course_id);
