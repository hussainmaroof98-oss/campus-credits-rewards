DROP FUNCTION IF EXISTS public.register_for_event(uuid, uuid, text);

CREATE FUNCTION public.register_for_event(
  p_student_id uuid,
  p_event_id uuid,
  p_team_name text DEFAULT NULL
)
RETURNS TABLE(reg_id uuid, reg_event_id uuid, reg_student_id uuid, reg_team_name text, reg_status text, reg_created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = p_student_id) THEN
    RAISE EXCEPTION 'Unknown student';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.status = 'live') THEN
    RAISE EXCEPTION 'Event is not open for registration';
  END IF;

  RETURN QUERY
  INSERT INTO public.event_registrations AS r (event_id, student_id, team_name, status)
  VALUES (p_event_id, p_student_id, NULLIF(btrim(coalesce(p_team_name, '')), ''), 'registered')
  ON CONFLICT (event_id, student_id) DO UPDATE
    SET team_name = COALESCE(NULLIF(btrim(coalesce(EXCLUDED.team_name, '')), ''), r.team_name),
        status = 'registered'
  RETURNING r.id, r.event_id, r.student_id, r.team_name, r.status, r.created_at;
END;
$$;