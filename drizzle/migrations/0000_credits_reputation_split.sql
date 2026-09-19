-- =============================================================================
-- CREDITS vs REPUTATION SPLIT
-- credit_balance = spendable currency (point_ledger only).
-- reputation     = standing / rank (achievements ledger only).
-- =============================================================================

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS reputation integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS last_checkpoint_rank integer;

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_visibility_check;
ALTER TABLE public.students
  ADD CONSTRAINT students_visibility_check CHECK (visibility IN ('public','tier','private'));

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  points integer NOT NULL,
  citation text NOT NULL,
  source text NOT NULL CHECK (source IN ('academic','event','team_bonus','penalty')),
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS achievements_student_idx ON public.achievements(student_id, created_at DESC);

GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public achievements are viewable" ON public.achievements;
-- Private rows (penalties) are never exposed directly; students read their own
-- full ledger through the my_achievements() security-definer RPC.
CREATE POLICY "Public achievements are viewable"
  ON public.achievements FOR SELECT USING (is_private = false);

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_campus_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- credits (spendable) from point_ledger
  UPDATE public.students s
  SET credit_balance = COALESCE(l.total, 0)
  FROM (
    SELECT st.id, (SELECT COALESCE(SUM(p.points), 0) FROM public.point_ledger p WHERE p.student_id = st.id) AS total
    FROM public.students st
  ) l
  WHERE l.id = s.id AND s.credit_balance IS DISTINCT FROM COALESCE(l.total, 0);

  -- reputation (standing) from achievements
  UPDATE public.students s
  SET reputation = COALESCE(a.total, 0)
  FROM (
    SELECT st.id, (SELECT COALESCE(SUM(x.points), 0) FROM public.achievements x WHERE x.student_id = st.id) AS total
    FROM public.students st
  ) a
  WHERE a.id = s.id AND s.reputation IS DISTINCT FROM COALESCE(a.total, 0);

  -- personal rank is reputation-based
  UPDATE public.students s
  SET personal_rank = r.rnk
  FROM (SELECT id, RANK() OVER (ORDER BY reputation DESC) AS rnk FROM public.students) r
  WHERE r.id = s.id AND s.personal_rank IS DISTINCT FROM r.rnk;

  INSERT INTO public.classes (section, branch, year, normalized_score)
  SELECT DISTINCT s.section, s.branch, s.year, 0
  FROM public.students s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.section = s.section AND c.branch = s.branch AND c.year = s.year
  );

  -- class score = average reputation per student, scaled 0-100 vs the best class
  UPDATE public.classes c
  SET normalized_score = ROUND(CASE WHEN m.best > 0 THEN (a.avg_points / m.best) * 100 ELSE 0 END, 2)
  FROM (
    SELECT section, branch, year, AVG(reputation)::numeric AS avg_points
    FROM public.students GROUP BY section, branch, year
  ) a
  CROSS JOIN LATERAL (
    SELECT COALESCE(MAX(x.avg_points), 0) AS best FROM (
      SELECT AVG(reputation)::numeric AS avg_points FROM public.students GROUP BY section, branch, year
    ) x
  ) m
  WHERE c.section = a.section AND c.branch = a.branch AND c.year = a.year;
END;
$$;

CREATE OR REPLACE FUNCTION public.achievements_recompute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recompute_campus_stats();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS achievements_recompute_trg ON public.achievements;
CREATE TRIGGER achievements_recompute_trg
AFTER INSERT OR UPDATE OR DELETE ON public.achievements
FOR EACH STATEMENT EXECUTE FUNCTION public.achievements_recompute();

-- ---------------------------------------------------------------------------
-- Awarding for an event raises BOTH spendable credits and reputation.
CREATE OR REPLACE FUNCTION public.staff_award_points(p_staff_id uuid, p_student_id uuid, p_event_id uuid, p_points integer, p_description text)
RETURNS TABLE(ledger_id uuid, ledger_points integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_desc text;
  v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students st WHERE st.id = p_student_id) THEN
    RAISE EXCEPTION 'Unknown student';
  END IF;
  IF coalesce(p_points, 0) = 0 THEN
    RAISE EXCEPTION 'Points must be non-zero';
  END IF;

  v_desc := COALESCE(NULLIF(btrim(coalesce(p_description, '')), ''),
                     COALESCE((SELECT e.title FROM public.events e WHERE e.id = p_event_id), 'Event participation'));

  INSERT INTO public.point_ledger (student_id, source, points, description)
  VALUES (p_student_id, 'event', p_points, v_desc)
  RETURNING id INTO v_id;

  INSERT INTO public.achievements (student_id, points, citation, source, is_private)
  VALUES (p_student_id, p_points, v_desc, 'event', false);

  RETURN QUERY SELECT v_id, p_points;
END;
$$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_penalty(p_staff_id uuid, p_student_id uuid, p_points integer, p_reason text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students st WHERE st.id = p_student_id) THEN
    RAISE EXCEPTION 'Unknown student';
  END IF;
  IF coalesce(p_points, 0) >= 0 THEN
    RAISE EXCEPTION 'A penalty must be a negative number of points';
  END IF;
  IF btrim(coalesce(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required for a penalty';
  END IF;

  -- Penalties only reduce reputation. Credits are never touched.
  INSERT INTO public.achievements (student_id, points, citation, source, is_private)
  VALUES (p_student_id, p_points, btrim(p_reason), 'penalty', true);

  RETURN QUERY SELECT true, 'Penalty applied';
END;
$$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_team_bonus(p_staff_id uuid, p_event_id uuid, p_student_ids uuid[], p_reputation_each integer, p_mvp_student_id uuid DEFAULT NULL, p_mvp_bonus integer DEFAULT 0)
RETURNS TABLE(awarded integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_title text;
  v_count integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;
  SELECT e.title INTO v_title FROM public.events e WHERE e.id = p_event_id;
  IF v_title IS NULL THEN RAISE EXCEPTION 'Unknown event'; END IF;
  IF coalesce(array_length(p_student_ids, 1), 0) = 0 THEN RAISE EXCEPTION 'No team members selected'; END IF;
  IF coalesce(p_reputation_each, 0) = 0 THEN RAISE EXCEPTION 'Reputation per member must be non-zero'; END IF;

  INSERT INTO public.achievements (student_id, points, citation, source, is_private)
  SELECT sid, p_reputation_each, 'Team bonus — ' || v_title, 'team_bonus', false
  FROM unnest(p_student_ids) AS sid
  WHERE EXISTS (SELECT 1 FROM public.students st WHERE st.id = sid);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF p_mvp_student_id IS NOT NULL AND coalesce(p_mvp_bonus, 0) <> 0 THEN
    INSERT INTO public.achievements (student_id, points, citation, source, is_private)
    VALUES (p_mvp_student_id, p_mvp_bonus, 'MVP — ' || v_title, 'team_bonus', false);
  END IF;

  RETURN QUERY SELECT v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Checkpoint bonuses pay out CREDITS for reputation standing.
-- NOTE: manually triggered by staff for now; a scheduled monthly job replaces
-- this call later.
CREATE OR REPLACE FUNCTION public.run_checkpoint_bonuses(p_staff_id uuid)
RETURNS TABLE(position_bonuses integer, growth_bonuses integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_pos integer := 0;
  v_growth integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;

  PERFORM public.recompute_campus_stats();

  -- top 3 per class
  INSERT INTO public.point_ledger (student_id, source, points, description)
  SELECT id, 'bonus',
         CASE rnk WHEN 1 THEN 300 WHEN 2 THEN 200 ELSE 100 END,
         'Top 3 in section — monthly checkpoint'
  FROM (
    SELECT s.id, RANK() OVER (PARTITION BY s.branch, s.section, s.year ORDER BY s.reputation DESC) AS rnk
    FROM public.students s
  ) r WHERE rnk <= 3;
  GET DIAGNOSTICS v_pos = ROW_COUNT;

  -- top 3 course-wide
  INSERT INTO public.point_ledger (student_id, source, points, description)
  SELECT id, 'bonus',
         CASE rnk WHEN 1 THEN 500 WHEN 2 THEN 350 ELSE 200 END,
         'Top 3 course-wide — monthly checkpoint'
  FROM (
    SELECT s.id, RANK() OVER (ORDER BY s.reputation DESC) AS rnk FROM public.students s
  ) r WHERE rnk <= 3;

  -- personal growth: improved course-wide rank since the last checkpoint
  INSERT INTO public.point_ledger (student_id, source, points, description)
  SELECT s.id, 'bonus', 75, 'Climbing the ranks!'
  FROM public.students s
  WHERE s.last_checkpoint_rank IS NOT NULL
    AND s.personal_rank IS NOT NULL
    AND s.personal_rank < s.last_checkpoint_rank;
  GET DIAGNOSTICS v_growth = ROW_COUNT;

  UPDATE public.students s SET last_checkpoint_rank = s.personal_rank;

  RETURN QUERY SELECT v_pos, v_growth;
END;
$$;

-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_achievements(p_student_id uuid)
RETURNS TABLE(id uuid, points integer, citation text, source text, is_private boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a.id, a.points, a.citation, a.source, a.is_private, a.created_at
  FROM public.achievements a
  WHERE a.student_id = p_student_id
  ORDER BY a.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.student_set_visibility(p_student_id uuid, p_visibility text)
RETURNS TABLE(visibility text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_visibility NOT IN ('public','tier','private') THEN
    RAISE EXCEPTION 'Invalid visibility';
  END IF;
  RETURN QUERY
  UPDATE public.students s SET visibility = p_visibility, updated_at = now()
  WHERE s.id = p_student_id
  RETURNING s.visibility;
END;
$$;

-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.student_leaderboard();
CREATE FUNCTION public.student_leaderboard()
RETURNS TABLE(id uuid, name text, section text, branch text, year integer, credit_balance integer, reputation integer, personal_rank integer, visibility text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT s.id, s.name, s.section, s.branch, s.year, s.credit_balance, s.reputation, s.personal_rank, s.visibility
  FROM public.students s
  ORDER BY s.reputation DESC
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.class_leaderboard()
RETURNS TABLE(id uuid, section text, branch text, year integer, normalized_score numeric, avg_points numeric, student_count integer, rank integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.id, c.section, c.branch, c.year, c.normalized_score,
         COALESCE(a.avg_points, 0)::numeric,
         COALESCE(a.cnt, 0)::integer,
         RANK() OVER (ORDER BY c.normalized_score DESC)::integer
  FROM public.classes c
  LEFT JOIN (
    SELECT section, branch, year, AVG(reputation)::numeric AS avg_points, COUNT(*)::int AS cnt
    FROM public.students GROUP BY section, branch, year
  ) a ON a.section = c.section AND a.branch = c.branch AND a.year = c.year
  ORDER BY c.normalized_score DESC;
$$;

DROP FUNCTION IF EXISTS public.student_stats(uuid);
CREATE FUNCTION public.student_stats(p_student_id uuid)
RETURNS TABLE(credit_balance integer, reputation integer, visibility text, personal_rank integer, total_students integer, class_rank integer, class_size integer, class_position integer, class_count integer, normalized_score numeric, points_behind_next_class numeric, next_class_label text, week_delta integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
#variable_conflict use_column
DECLARE
  v_section text; v_branch text; v_year integer; v_balance integer; v_rep integer; v_vis text;
BEGIN
  SELECT s.section, s.branch, s.year, s.credit_balance, s.reputation, s.visibility
    INTO v_section, v_branch, v_year, v_balance, v_rep, v_vis
  FROM public.students s WHERE s.id = p_student_id;
  IF v_section IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH cls AS (SELECT * FROM public.class_leaderboard()),
  mycls AS (SELECT * FROM cls c WHERE c.section = v_section AND c.branch = v_branch AND c.year = v_year),
  nextcls AS (
    SELECT * FROM cls c
    WHERE c.normalized_score > (SELECT m.normalized_score FROM mycls m)
    ORDER BY c.normalized_score ASC LIMIT 1
  )
  SELECT
    v_balance,
    v_rep,
    v_vis,
    (SELECT s.personal_rank FROM public.students s WHERE s.id = p_student_id),
    (SELECT COUNT(*)::int FROM public.students),
    (SELECT COUNT(*)::int + 1 FROM public.students s2
       WHERE s2.section = v_section AND s2.branch = v_branch AND s2.year = v_year
         AND s2.reputation > v_rep),
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
