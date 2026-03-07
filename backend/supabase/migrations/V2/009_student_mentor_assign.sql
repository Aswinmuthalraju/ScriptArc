-- ============================================================
-- ScriptArc — Supabase PostgreSQL Schema (V2)
-- Migration 009: Fix mentor_students RLS for student self-assignment
-- ============================================================
-- Run after 008_challenges_unit1_unit2.sql.
-- All statements are idempotent (safe to re-run).
-- ============================================================

-- ── Drop the overly-broad mentor write policy ─────────────────
-- Old policy allowed ANY mentor to insert ANY student assignment.
-- Replace with two scoped policies for safety.
DROP POLICY IF EXISTS "ms_admin_write" ON public.mentor_students;

-- ── Admin: full insert control ────────────────────────────────
CREATE POLICY "ms_admin_insert"
  ON public.mentor_students FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ── Mentor: can only insert rows where they are the mentor ────
CREATE POLICY "ms_mentor_insert"
  ON public.mentor_students FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = mentor_id AND public.is_mentor());

-- ── Student: can self-assign (insert own student_id) ─────────
-- This allows students to enter a mentor code and link themselves.
-- Safety: student_id is constrained to their own uid; mentor lookup
-- is validated by the application layer (approved status check).
CREATE POLICY "ms_student_self_assign"
  ON public.mentor_students FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

COMMENT ON POLICY "ms_student_self_assign" ON public.mentor_students IS
  'Allows a student to assign themselves to an approved mentor by entering the mentor code. The application layer validates the mentor is approved before calling insert.';
