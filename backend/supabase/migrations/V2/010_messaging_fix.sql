-- ============================================================
-- ScriptArc — Supabase PostgreSQL Schema (V2)
-- Migration 010: Fix mentor_profiles RLS + bidirectional messaging
-- ============================================================
-- Run after 009_student_mentor_assign.sql.
-- All statements are idempotent (safe to re-run).
-- NOTE: PostgreSQL does NOT support "CREATE POLICY IF NOT EXISTS".
--       Use DROP + CREATE for idempotency.
-- ============================================================

-- ── Fix 1: Allow students to read approved mentor profiles ──────
-- The old mp_select policy only lets a user read their own row,
-- approved mentors, or admins — students are completely excluded.
-- This caused "Invalid or unapproved mentor ID" because the SELECT
-- returned null even for valid, approved mentor codes.
DROP POLICY IF EXISTS "mp_approved_select" ON public.mentor_profiles;
CREATE POLICY "mp_approved_select"
  ON public.mentor_profiles FOR SELECT TO authenticated
  USING (status = 'approved');

-- ── Fix 2: Add from_student column for bidirectional messaging ──
-- false = mentor→student (original direction)
-- true  = student→mentor (student reply)
ALTER TABLE public.mentor_messages
  ADD COLUMN IF NOT EXISTS from_student boolean NOT NULL DEFAULT false;

-- ── Fix 3: Restrict mentor INSERT to mentor→student only ────────
DROP POLICY IF EXISTS "mm_mentor_insert" ON public.mentor_messages;
CREATE POLICY "mm_mentor_insert"
  ON public.mentor_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = mentor_id AND public.is_mentor() AND from_student = false);

-- ── Fix 4: Allow students to reply to their assigned mentor ──────
DROP POLICY IF EXISTS "mm_student_insert" ON public.mentor_messages;
CREATE POLICY "mm_student_insert"
  ON public.mentor_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id
    AND from_student = true
    AND EXISTS (
      SELECT 1 FROM public.mentor_students ms
      WHERE ms.student_id = auth.uid()
        AND ms.mentor_id = mentor_id
    )
  );

-- ── Fix 5: Allow mentors to mark student messages as read ────────
DROP POLICY IF EXISTS "mm_mentor_update" ON public.mentor_messages;
CREATE POLICY "mm_mentor_update"
  ON public.mentor_messages FOR UPDATE TO authenticated
  USING  (auth.uid() = mentor_id AND from_student = true)
  WITH CHECK (auth.uid() = mentor_id AND from_student = true);
