-- ============================================================
-- ScriptArc — Supabase PostgreSQL Schema (V2)
-- Migration 011: Certificate System Fix
-- ============================================================
-- Fixes 404/Permission issues by broadening search_path and 
-- adding explicit grants.

CREATE OR REPLACE FUNCTION public.generate_certificate(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth, extensions
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
     AND ms.course_id = p_course_id
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
  v_hash_input :=
    v_student_name || '|' ||
    v_course_name  || '|' ||
    v_mentor_name  || '|' ||
    v_score::text  || '|' ||
    v_max_score::text || '|' ||
    CURRENT_DATE::text || '|' ||
    v_cert_id;

  -- Using digest from pgcrypto (in public or extensions)
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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_certificate(uuid) TO authenticated;
