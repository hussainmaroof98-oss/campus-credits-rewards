CREATE OR REPLACE FUNCTION public.student_register(
  p_enrollment_number text,
  p_name text,
  p_section text,
  p_branch text,
  p_year integer,
  p_password text
)
RETURNS TABLE(id uuid, enrollment_number text, name text, section text, branch text, year integer, credit_balance integer, personal_rank integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_enroll text := upper(btrim(coalesce(p_enrollment_number, '')));
  v_id uuid;
BEGIN
  -- PLACEHOLDER SELF-REGISTRATION: temporary stand-in so real students can test
  -- the app before the university SSO/LDAP partnership is live. Once identity
  -- comes from the university directory, self-registration is removed entirely.
  IF v_enroll = '' THEN RAISE EXCEPTION 'Enrollment number is required'; END IF;
  IF btrim(coalesce(p_name, '')) = '' THEN RAISE EXCEPTION 'Full name is required'; END IF;
  IF btrim(coalesce(p_section, '')) = '' THEN RAISE EXCEPTION 'Section is required'; END IF;
  IF btrim(coalesce(p_branch, '')) = '' THEN RAISE EXCEPTION 'Branch is required'; END IF;
  IF coalesce(p_year, 0) < 1 OR coalesce(p_year, 0) > 4 THEN RAISE EXCEPTION 'Year must be between 1 and 4'; END IF;
  IF length(coalesce(p_password, '')) < 6 THEN RAISE EXCEPTION 'Password must be at least 6 characters'; END IF;

  IF EXISTS (SELECT 1 FROM public.students s WHERE upper(s.enrollment_number) = v_enroll) THEN
    RAISE EXCEPTION 'An account with this enrollment number already exists';
  END IF;

  INSERT INTO public.students (enrollment_number, name, section, branch, year, password_hash, credit_balance)
  VALUES (v_enroll, btrim(p_name), upper(btrim(p_section)), btrim(p_branch), p_year,
          extensions.crypt(p_password, extensions.gen_salt('bf')), 0)
  RETURNING students.id INTO v_id;

  PERFORM public.recompute_campus_stats();

  RETURN QUERY
  SELECT s.id, s.enrollment_number, s.name, s.section, s.branch, s.year, s.credit_balance, s.personal_rank
  FROM public.students s WHERE s.id = v_id;
END;
$function$;