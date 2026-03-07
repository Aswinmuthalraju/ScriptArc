-- ============================================================
-- ScriptArc — Supabase PostgreSQL Schema (V2)
-- Migration 005: Mentor System
-- ============================================================

-- ============================================================
-- 1. MENTOR PROFILES
--    One row per mentor application/approval, keyed by user_id.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentor_profiles (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  mentor_code      text        UNIQUE,            -- MNTR-XXXX, generated on approval
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected')),
  expertise        text,
  experience_years int,
  bio              text,
  linkedin_url     text,
  portfolio_url    text,
  rejection_reason text,
  approved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. MENTOR–STUDENT ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentor_students (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id   uuid        REFERENCES public.courses(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, student_id)
);

-- ============================================================
-- 3. MENTOR MESSAGES  (mentor → student)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentor_messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject      text,
  message      text        NOT NULL,
  message_type text        NOT NULL DEFAULT 'feedback'
               CHECK (message_type IN ('feedback','clarification','revision','motivation','warning')),
  read         boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. MENTOR INTERVENTIONS  (audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentor_interventions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type text        NOT NULL
              CHECK (action_type IN ('hint_unlock','retry_allow','warning','revision_assigned')),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_user_id  ON public.mentor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_status   ON public.mentor_profiles(status);
CREATE INDEX IF NOT EXISTS idx_mentor_students_mentor   ON public.mentor_students(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_students_student  ON public.mentor_students(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_messages_mentor   ON public.mentor_messages(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_messages_student  ON public.mentor_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_interventions_m   ON public.mentor_interventions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_interventions_s   ON public.mentor_interventions(student_id);

-- ============================================================
-- 6. RLS
-- ============================================================
ALTER TABLE public.mentor_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_interventions ENABLE ROW LEVEL SECURITY;

-- Admin check: email-based, no extra DB column required
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT lower(auth.jwt() ->> 'email') = 'scriptarc.dev@gmail.com';
$$;

-- ── mentor_profiles ───────────────────────────────────────────
-- Own row: read/insert. Approved mentors: read all (so students can browse). Admin: full control.
CREATE POLICY "mp_select"
  ON public.mentor_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin() OR public.is_mentor());

CREATE POLICY "mp_insert_own"
  ON public.mentor_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mp_admin_update"
  ON public.mentor_profiles FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── mentor_students ───────────────────────────────────────────
-- Admin manages; mentor sees their rows; student sees their own assignment.
CREATE POLICY "ms_select"
  ON public.mentor_students FOR SELECT TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = student_id OR public.is_admin());

CREATE POLICY "ms_admin_write"
  ON public.mentor_students FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_mentor());

CREATE POLICY "ms_admin_delete"
  ON public.mentor_students FOR DELETE TO authenticated
  USING (public.is_admin() OR auth.uid() = mentor_id);

-- ── mentor_messages ───────────────────────────────────────────
CREATE POLICY "mm_select"
  ON public.mentor_messages FOR SELECT TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = student_id OR public.is_admin());

CREATE POLICY "mm_mentor_insert"
  ON public.mentor_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = mentor_id AND public.is_mentor());

-- Students can mark messages as read
CREATE POLICY "mm_student_update"
  ON public.mentor_messages FOR UPDATE TO authenticated
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- ── mentor_interventions ──────────────────────────────────────
CREATE POLICY "mi_select"
  ON public.mentor_interventions FOR SELECT TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = student_id OR public.is_admin());

CREATE POLICY "mi_mentor_insert"
  ON public.mentor_interventions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = mentor_id AND public.is_mentor());

-- ============================================================
-- 7. AUTO-GENERATE mentor_code ON APPROVAL
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_mentor_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.mentor_code IS NULL THEN
    NEW.mentor_code := 'MNTR-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0');
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_mentor_code
  BEFORE UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_mentor_code();

-- ============================================================
-- 8. EXTEND user_role ENUM to include 'admin' (optional upgrade)
--    We use email-based is_admin() instead to keep schema simple.
-- ============================================================
-- (No enum change needed — admin identified purely by email.)
