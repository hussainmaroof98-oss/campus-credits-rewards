-- Recompute balances, personal ranks, class rows and normalized class scores from point_ledger
CREATE OR REPLACE FUNCTION public.recompute_campus_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. balances from ledger
  UPDATE public.students s
  SET credit_balance = COALESCE(l.total, 0)
  FROM (
    SELECT st.id, (SELECT COALESCE(SUM(p.points), 0) FROM public.point_ledger p WHERE p.student_id = st.id) AS total
    FROM public.students st
  ) l
  WHERE l.id = s.id AND s.credit_balance IS DISTINCT FROM COALESCE(l.total, 0);

  -- 2. course-wide personal rank
  UPDATE public.students s
  SET personal_rank = r.rnk
  FROM (
    SELECT id, RANK() OVER (ORDER BY credit_balance DESC) AS rnk
    FROM public.students
  ) r
  WHERE r.id = s.id AND s.personal_rank IS DISTINCT FROM r.rnk;

  -- 3. ensure a class row exists for every branch/section/year with students
  INSERT INTO public.classes (section, branch, year, normalized_score)
  SELECT DISTINCT s.section, s.branch, s.year, 0
  FROM public.students s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.section = s.section AND c.branch = s.branch AND c.year = s.year
  );

  -- 4. normalized score = avg points per student, scaled 0-100 vs the best class
  UPDATE public.classes c
  SET normalized_score = ROUND(
        CASE WHEN m.best > 0 THEN (a.avg_points / m.best) * 100 ELSE 0 END, 2)
  FROM (
    SELECT section, branch, year, AVG(credit_balance)::numeric AS avg_points
    FROM public.students
    GROUP BY section, branch, year
  ) a
  CROSS JOIN LATERAL (
    SELECT COALESCE(MAX(x.avg_points), 0) AS best FROM (
      SELECT AVG(credit_balance)::numeric AS avg_points
      FROM public.students GROUP BY section, branch, year
    ) x
  ) m
  WHERE c.section = a.section AND c.branch = a.branch AND c.year = a.year;
END;
$$;

-- keep everything fresh whenever points change
CREATE OR REPLACE FUNCTION public.point_ledger_recompute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_campus_stats();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS point_ledger_recompute_trg ON public.point_ledger;
CREATE TRIGGER point_ledger_recompute_trg
AFTER INSERT OR UPDATE OR DELETE ON public.point_ledger
FOR EACH STATEMENT EXECUTE FUNCTION public.point_ledger_recompute();

-- class leaderboard (normalized, size-independent)
CREATE OR REPLACE FUNCTION public.class_leaderboard()
RETURNS TABLE(id uuid, section text, branch text, year integer, normalized_score numeric, avg_points numeric, student_count integer, rank integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.section, c.branch, c.year, c.normalized_score,
         COALESCE(a.avg_points, 0)::numeric,
         COALESCE(a.cnt, 0)::integer,
         RANK() OVER (ORDER BY c.normalized_score DESC)::integer
  FROM public.classes c
  LEFT JOIN (
    SELECT section, branch, year, AVG(credit_balance)::numeric AS avg_points, COUNT(*)::int AS cnt
    FROM public.students GROUP BY section, branch, year
  ) a ON a.section = c.section AND a.branch = c.branch AND a.year = c.year
  ORDER BY c.normalized_score DESC;
$$;

-- per-student stats for the home screen
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
DECLARE
  v_section text; v_branch text; v_year integer;
BEGIN
  SELECT s.section, s.branch, s.year INTO v_section, v_branch, v_year
  FROM public.students s WHERE s.id = p_student_id;
  IF v_section IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH me AS (
    SELECT s.credit_balance, s.personal_rank FROM public.students s WHERE s.id = p_student_id
  ),
  cls AS (
    SELECT * FROM public.class_leaderboard()
  ),
  mycls AS (
    SELECT * FROM cls WHERE cls.section = v_section AND cls.branch = v_branch AND cls.year = v_year
  ),
  nextcls AS (
    SELECT * FROM cls
    WHERE cls.normalized_score > (SELECT normalized_score FROM mycls)
    ORDER BY cls.normalized_score ASC LIMIT 1
  )
  SELECT
    (SELECT credit_balance FROM me),
    (SELECT personal_rank FROM me),
    (SELECT COUNT(*)::int FROM public.students),
    (SELECT COUNT(*)::int + 1 FROM public.students s2
       WHERE s2.section = v_section AND s2.branch = v_branch AND s2.year = v_year
         AND s2.credit_balance > (SELECT credit_balance FROM me)),
    (SELECT COUNT(*)::int FROM public.students s3
       WHERE s3.section = v_section AND s3.branch = v_branch AND s3.year = v_year),
    (SELECT rank FROM mycls),
    (SELECT COUNT(*)::int FROM cls),
    (SELECT normalized_score FROM mycls),
    COALESCE(ROUND((SELECT avg_points FROM nextcls) - (SELECT avg_points FROM mycls), 0), 0),
    (SELECT branch || '-' || section FROM nextcls),
    (SELECT COALESCE(SUM(p.points), 0)::int FROM public.point_ledger p
      WHERE p.student_id = p_student_id AND p.created_at > now() - interval '7 days');
END;
$$;

SELECT public.recompute_campus_stats();