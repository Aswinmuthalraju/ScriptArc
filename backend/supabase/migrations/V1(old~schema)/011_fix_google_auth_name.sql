-- ============================================================
-- Add fallback for Google Auth `full_name` metadata in user creation trigger
-- Also accounts for GitHub/Google OAuth metadata differences
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, name, role)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.email
    ),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
