-- ============================================================
-- ScriptArc — Migration 013: Points System
--
-- Points replace stars as the platform progress metric.
-- MCQ: max 2 pts (2=independent, 1=hint, 0=solution)
-- Coding: max 4 pts (4=independent, 2=hint, 0=solution)
-- Stars are reserved for certificate ratings only.
-- ============================================================

-- 1) Update calculate_marks to support new point values
CREATE OR REPLACE FUNCTION public.calculate_marks(
  p_challenge_type text,
  p_hint_used boolean,
  p_solution_viewed boolean
) RETURNS int LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
  IF p_solution_viewed THEN RETURN 0; END IF;
  IF p_hint_used THEN
    IF p_challenge_type = 'coding' THEN RETURN 2;
    ELSE RETURN 1;
    END IF;
  END IF;
  IF p_challenge_type = 'coding' THEN RETURN 4;
  ELSE RETURN 2;
  END IF;
END; $$;

-- Drop old 2-arg overload so it doesn't shadow the new function
DROP FUNCTION IF EXISTS public.calculate_marks(boolean, boolean);

-- 2) Update trigger: SUM all stars_awarded (now points) instead of COUNT where = 2
CREATE OR REPLACE FUNCTION public.update_user_total_stars()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.users
  SET total_stars = (
    SELECT COALESCE(SUM(stars_awarded), 0)
    FROM public.submissions
    WHERE user_id = NEW.user_id
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END; $$;

-- 3) Update challenge star_values to match new point system
--    MCQ: 1 → 2, Coding: 2 → 4
UPDATE public.challenges SET star_value = 2 WHERE challenge_type = 'mcq' AND star_value = 1;
UPDATE public.challenges SET star_value = 4 WHERE challenge_type = 'coding' AND star_value = 2;

-- 4) Recompute total_stars (now total points) for all existing users
UPDATE public.users u
SET total_stars = COALESCE((
  SELECT SUM(s.stars_awarded)
  FROM public.submissions s
  WHERE s.user_id = u.id
), 0);
