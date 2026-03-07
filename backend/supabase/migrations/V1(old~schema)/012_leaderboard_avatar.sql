-- ============================================================
-- ScriptArc — Migration 012: Add avatar_id to leaderboard view
-- ============================================================

CREATE OR REPLACE VIEW public.leaderboard
  WITH (security_invoker = on) AS
  SELECT
    ROW_NUMBER() OVER (ORDER BY total_stars DESC) AS rank,
    id,
    name,
    total_stars,
    level,
    avatar_id
  FROM public.users
  WHERE is_private = false
  ORDER BY total_stars DESC;
