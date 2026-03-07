-- ============================================================
-- ScriptArc — Supabase PostgreSQL Schema (V2)
-- Migration 007: Certificate System
-- ============================================================
-- Run after 006_security_fixes.sql.
-- All statements are idempotent (safe to re-run).
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- for SHA-256 hashing


-- ============================================================
-- 2. SEQUENCE: incrementing certificate numbers
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.certificate_seq START 1;


-- ============================================================
-- 3. CERTIFICATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id   text        NOT NULL UNIQUE,
  user_id          uuid        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  course_id        uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_name     text        NOT NULL,
  course_name      text        NOT NULL,
  mentor_name      text        NOT NULL DEFAULT 'ScriptArc',
  score            int         NOT NULL DEFAULT 0,
  max_score        int         NOT NULL DEFAULT 1,
  star_rating      int         NOT NULL DEFAULT 1 CHECK (star_rating BETWEEN 1 AND 5),
  completion_date  date        NOT NULL DEFAULT CURRENT_DATE,
  certificate_hash text        NOT NULL,   -- SHA-256 of key fields for tamper detection
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)               -- one certificate per student per course
);

CREATE INDEX IF NOT EXISTS idx_certs_certificate_id ON public.certificates(certificate_id);
CREATE INDEX IF NOT EXISTS idx_certs_user_id        ON public.certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certs_course_id      ON public.certificates(course_id);


-- ============================================================
-- 4. RLS
-- Anyone can SELECT (public QR verification); only the owner inserts (via DEFINER fn)
-- ============================================================
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certs_public_select"
  ON public.certificates FOR SELECT USING (true);

-- Direct inserts are blocked; only the SECURITY DEFINER function can write
CREATE POLICY "certs_no_direct_insert"
  ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (false);


-- ============================================================
-- 5. GENERATE OR RETRIEVE A CERTIFICATE (idempotent RPC)
-- Call: supabase.rpc('generate_certificate', { p_course_id: '...' })
-- Returns: JSONB with all certificate fields
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_certificate(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id      uuid;
  v_student_name text;
  v_course_name  text;
  v_mentor_name  text := 'ScriptArc';
  v_score        int  := 0;
  v_max_score    int  := 1;
  v_pct          numeric;
  v_star_rating  int  := 1;
  v_cert_id      text;
  v_hash_input   text;
  v_hash         text;
  v_cert         public.certificates%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Return existing certificate (idempotent) ──────────────
  SELECT * INTO v_cert
    FROM public.certificates
   WHERE user_id = v_user_id AND course_id = p_course_id;

  IF FOUND THEN
    RETURN to_jsonb(v_cert);
  END IF;

  -- ── Completion check: every lesson in this course that has at
  --    least one challenge must be marked completed for this user ──
  IF EXISTS (
    SELECT 1
      FROM public.lessons l
     WHERE l.course_id = p_course_id
       AND EXISTS (SELECT 1 FROM public.challenges c WHERE c.lesson_id = l.id)
       AND NOT EXISTS (
             SELECT 1
               FROM public.user_progress up
              WHERE up.lesson_id = l.id
                AND up.user_id   = v_user_id
                AND up.completed = true
           )
  ) THEN
    RAISE EXCEPTION 'Course not yet fully completed';
  END IF;

  -- ── Lookup student, course, mentor ───────────────────────
  SELECT name  INTO v_student_name FROM public.users   WHERE id = v_user_id;
  SELECT title INTO v_course_name  FROM public.courses WHERE id = p_course_id;

  SELECT u.name INTO v_mentor_name
    FROM public.mentor_students ms
    JOIN public.users u ON u.id = ms.mentor_id
   WHERE ms.student_id = v_user_id
   ORDER BY ms.assigned_at
   LIMIT 1;

  IF v_mentor_name IS NULL THEN v_mentor_name := 'ScriptArc'; END IF;

  -- ── Score: sum of stars_awarded for this course's challenges ─
  SELECT
    COALESCE(SUM(s.stars_awarded), 0),
    COALESCE(SUM(CASE WHEN c.challenge_type = 'coding' THEN 4 ELSE 2 END), 1)
  INTO v_score, v_max_score
  FROM public.challenges c
  JOIN public.lessons l ON l.id = c.lesson_id
  LEFT JOIN public.submissions s ON s.challenge_id = c.id AND s.user_id = v_user_id
  WHERE l.course_id = p_course_id;

  IF v_max_score < 1 THEN v_max_score := 1; END IF;

  -- ── Star rating ───────────────────────────────────────────
  v_pct := (v_score::numeric / v_max_score::numeric) * 100;
  v_star_rating := CASE
    WHEN v_pct >= 90 THEN 5
    WHEN v_pct >= 75 THEN 4
    WHEN v_pct >= 60 THEN 3
    WHEN v_pct >= 45 THEN 2
    ELSE 1
  END;

  -- ── Unique certificate ID ─────────────────────────────────
  v_cert_id := 'SCR-' || EXTRACT(YEAR FROM now())::text
    || '-' || LPAD(nextval('public.certificate_seq')::text, 6, '0');

  -- ── SHA-256 tamper-detection hash ─────────────────────────
  -- Format: name|course|mentor|score|maxScore|date|certId
  -- Anyone can recompute this with the same inputs to verify authenticity.
  v_hash_input :=
    v_student_name || '|' ||
    v_course_name  || '|' ||
    v_mentor_name  || '|' ||
    v_score::text  || '|' ||
    v_max_score::text || '|' ||
    CURRENT_DATE::text || '|' ||
    v_cert_id;

  v_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

  -- ── Insert (bypasses RLS via SECURITY DEFINER) ────────────
  INSERT INTO public.certificates (
    certificate_id, user_id,    course_id,
    student_name,   course_name, mentor_name,
    score,          max_score,   star_rating,
    completion_date, certificate_hash
  ) VALUES (
    v_cert_id,      v_user_id,  p_course_id,
    v_student_name, v_course_name, v_mentor_name,
    v_score,        v_max_score, v_star_rating,
    CURRENT_DATE,   v_hash
  )
  RETURNING * INTO v_cert;

  RETURN to_jsonb(v_cert);
END;
$$;

COMMENT ON FUNCTION public.generate_certificate IS
  'Idempotent: generates and stores a certificate when a course is fully completed, or returns the existing one. SHA-256 hash enables tamper detection on the verify page.';
