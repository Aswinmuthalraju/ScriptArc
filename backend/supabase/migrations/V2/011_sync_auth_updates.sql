-- ============================================================
-- ScriptArc — Supabase PostgreSQL Schema (V2)
-- Migration 010: Sync Auth Updates to Public Users
-- ============================================================

-- Function to handle updates to auth.users (like when role is added post-OAuth)
CREATE OR REPLACE FUNCTION public.handle_user_update()
  RETURNS TRIGGER LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET role = CASE 
               WHEN NEW.raw_user_meta_data->>'role' IN ('student', 'mentor') 
               THEN (NEW.raw_user_meta_data->>'role')::public.user_role
               ELSE public.users.role
             END,
      name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', public.users.name)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger to fire whenever raw_user_meta_data changes (e.g., from updateUser() call in AuthCallback)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.handle_user_update();

-- ============================================================
-- RETROACTIVE FIX FOR EXISTING USERS
-- Run this block manually to fix any mentors already stuck as 'student'
-- ============================================================
UPDATE public.users u
SET role = (au.raw_user_meta_data->>'role')::public.user_role
FROM auth.users au
WHERE u.id = au.id
  AND au.raw_user_meta_data->>'role' IN ('student', 'mentor')
  AND u.role::text != au.raw_user_meta_data->>'role';
