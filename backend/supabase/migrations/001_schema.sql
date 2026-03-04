-- ============================================================
-- ScriptArc — Supabase PostgreSQL Schema
-- Migration 001: Core Tables
-- ============================================================

-- Custom enum for user roles
CREATE TYPE user_role AS ENUM ('student', 'mentor');

-- ============================================================
-- 1) USERS TABLE
--    Extends Supabase auth.users via foreign key.
--    Created automatically on signup via trigger (see bottom).
-- ============================================================
CREATE TABLE public.users (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text,
  role        user_role   NOT NULL DEFAULT 'student'::user_role,
  total_stars int         NOT NULL DEFAULT 0,
  level       int         NOT NULL DEFAULT 1,
  is_private  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.users IS 'Public profile for every authenticated user';
COMMENT ON COLUMN public.users.is_private IS 'When true the user is hidden from the leaderboard';

-- ============================================================
-- 2) COURSES TABLE
-- ============================================================
CREATE TABLE public.courses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3) CHALLENGES TABLE
-- ============================================================
CREATE TABLE public.challenges (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid    NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title       text    NOT NULL,
  difficulty  text    NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  star_value  int     NOT NULL CHECK (star_value > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_challenges_course ON public.challenges(course_id);

-- ============================================================
-- 4) SUBMISSIONS TABLE
-- ============================================================
CREATE TABLE public.submissions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id  uuid        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  attempts      int         NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  hint_used     boolean     NOT NULL DEFAULT false,
  stars_awarded int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_submissions_user      ON public.submissions(user_id);
CREATE INDEX idx_submissions_challenge ON public.submissions(challenge_id);

-- ============================================================
-- TRIGGER: Auto-create a public.users row on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', new.email),
    'student'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
