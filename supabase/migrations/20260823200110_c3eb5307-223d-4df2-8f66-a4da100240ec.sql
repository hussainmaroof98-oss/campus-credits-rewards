CREATE OR REPLACE FUNCTION public.student_leaderboard()
RETURNS TABLE (
  id uuid,
  name text,
  section text,
  branch text,
  year int,
  credit_balance int,
  personal_rank int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.section, s.branch, s.year, s.credit_balance, s.personal_rank
  FROM public.students s
  ORDER BY s.credit_balance DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.student_leaderboard() TO anon, authenticated;