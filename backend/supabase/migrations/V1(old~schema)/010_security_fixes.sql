-- ============================================================
-- ScriptArc — Migration 010: Security Fixes
-- ============================================================

-- ------------------------------------------------------------
-- 1. Prevent privilege escalation via users UPDATE
--
-- RLS cannot restrict which columns a user may update on their
-- own row. A BEFORE UPDATE trigger is the correct pattern to
-- freeze columns that clients must never be allowed to change.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
  RETURNS TRIGGER LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.role               := OLD.role;
  NEW.total_stars        := OLD.total_stars;
  NEW.has_special_access := OLD.has_special_access;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_escalation ON public.users;

CREATE TRIGGER trg_prevent_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

-- ------------------------------------------------------------
-- 2. Explicit DENY policies on submissions
--
-- Supabase defaults to deny when no policy matches, but being
-- explicit prevents accidental future grants and makes intent
-- clear in the policy list.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "submissions_no_update" ON public.submissions;
DROP POLICY IF EXISTS "submissions_no_delete" ON public.submissions;

CREATE POLICY "submissions_no_update"
  ON public.submissions FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "submissions_no_delete"
  ON public.submissions FOR DELETE TO authenticated
  USING (false);

-- ------------------------------------------------------------
-- 3. Fix handle_new_user SECURITY DEFINER search_path
--
-- SECURITY DEFINER functions should use SET search_path = ''
-- and fully-qualify all identifiers to prevent object resolution
-- hijacking via a malicious search_path.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
