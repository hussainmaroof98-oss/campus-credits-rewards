CREATE OR REPLACE FUNCTION public.staff_search_students(p_staff_id uuid, p_query text)
RETURNS TABLE(id uuid, name text, enrollment_number text, branch text, section text, year integer, reputation integer, credit_balance integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;
  IF btrim(coalesce(p_query, '')) = '' THEN RETURN; END IF;

  RETURN QUERY
  SELECT s.id, s.name, s.enrollment_number, s.branch, s.section, s.year, s.reputation, s.credit_balance
  FROM public.students s
  WHERE s.name ILIKE '%' || btrim(p_query) || '%'
     OR s.enrollment_number ILIKE '%' || btrim(p_query) || '%'
  ORDER BY s.name
  LIMIT 15;
END;
$$;
