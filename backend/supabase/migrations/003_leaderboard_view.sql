-- ============================================================
-- ScriptArc — Leaderboard View & Hint Logic
-- Migration 003
-- ============================================================

-- ============================================================
-- LEADERBOARD VIEW
-- Returns ranked users who have NOT opted into privacy.
-- ============================================================
CREATE OR REPLACE VIEW public.leaderboard
  WITH (security_invoker = on)
  AS
  SELECT
    ROW_NUMBER() OVER (ORDER BY total_stars DESC) AS rank,
    id,
    name,
    total_stars,
    level
  FROM public.users
  WHERE is_private = false
  ORDER BY total_stars DESC;

-- ============================================================
-- HINT SYSTEM — Star Calculation Function
--
-- Rules:
--   • Hints become available when attempts >= 2
--   • If hint_used = true  → award 50 % of star_value
--   • If hint_used = false → award 100 % of star_value
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_stars(
  p_star_value int,
  p_hint_used  boolean
)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF p_hint_used THEN
    RETURN GREATEST(FLOOR(p_star_value * 0.5)::int, 1);
  ELSE
    RETURN p_star_value;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.calculate_stars IS
  'Returns the stars to award for a challenge submission, halved when a hint was used';
