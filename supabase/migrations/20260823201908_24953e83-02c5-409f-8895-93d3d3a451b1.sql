CREATE OR REPLACE FUNCTION public.student_stats(p_student_id uuid)
RETURNS TABLE(
  credit_balance integer,
  personal_rank integer,
  total_students integer,
  class_rank integer,
  class_size integer,
  class_position integer,
  class_count integer,
  normalized_score numeric,
  points_behind_next_class numeric,
  next_class_label text,
  week_delta integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_section text; v_branch text; v_year integer; v_balance integer;
BEGIN
  SELECT s.section, s.branch, s.year, s.credit_balance
    INTO v_section, v_branch, v_year, v_balance
  FROM public.students s WHERE s.id = p_student_id;
  IF v_section IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH cls AS (SELECT * FROM public.class_leaderboard()),
  mycls AS (
    SELECT * FROM cls c WHERE c.section = v_section AND c.branch = v_branch AND c.year = v_year
  ),
  nextcls AS (
    SELECT * FROM cls c
    WHERE c.normalized_score > (SELECT m.normalized_score FROM mycls m)
    ORDER BY c.normalized_score ASC LIMIT 1
  )
  SELECT
    v_balance,
    (SELECT s.personal_rank FROM public.students s WHERE s.id = p_student_id),
    (SELECT COUNT(*)::int FROM public.students),
    (SELECT COUNT(*)::int + 1 FROM public.students s2
       WHERE s2.section = v_section AND s2.branch = v_branch AND s2.year = v_year
         AND s2.credit_balance > v_balance),
    (SELECT COUNT(*)::int FROM public.students s3
       WHERE s3.section = v_section AND s3.branch = v_branch AND s3.year = v_year),
    (SELECT m.rank FROM mycls m),
    (SELECT COUNT(*)::int FROM cls),
    (SELECT m.normalized_score FROM mycls m),
    COALESCE(ROUND((SELECT n.avg_points FROM nextcls n) - (SELECT m.avg_points FROM mycls m), 0), 0),
    (SELECT n.branch || '-' || n.section FROM nextcls n),
    (SELECT COALESCE(SUM(p.points), 0)::int FROM public.point_ledger p
      WHERE p.student_id = p_student_id AND p.created_at > now() - interval '7 days');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_campus_stats() FROM anon, authenticated, public;