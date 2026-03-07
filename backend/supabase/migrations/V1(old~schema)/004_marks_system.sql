-- 1) Add solution_viewed to submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS solution_viewed boolean NOT NULL DEFAULT false;

-- 2) Add hints + solution to challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS hints jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS solution text;

-- 3) Replace calculate_stars with calculate_marks
--    stars_awarded column is re-purposed: 2 = full marks + star, 1 = partial marks
DROP FUNCTION IF EXISTS public.calculate_stars(int, boolean);

CREATE OR REPLACE FUNCTION public.calculate_marks(
  p_hint_used boolean, p_solution_viewed boolean
) RETURNS int LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
  IF p_hint_used OR p_solution_viewed THEN RETURN 1;
  ELSE RETURN 2;
  END IF;
END; $$;

-- 4) Trigger: auto-update users.total_stars on every submission insert
--    total_stars = count of submissions where stars_awarded = 2 (independently solved)
CREATE OR REPLACE FUNCTION public.update_user_total_stars()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users
  SET total_stars = (
    SELECT COUNT(*) FROM public.submissions
    WHERE user_id = NEW.user_id AND stars_awarded = 2
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_submission_inserted ON public.submissions;
CREATE TRIGGER on_submission_inserted
  AFTER INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_user_total_stars();
