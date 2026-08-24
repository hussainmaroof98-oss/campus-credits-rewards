-- PLACEHOLDER AUTHORIZATION: verifies only that the staff account exists.
CREATE OR REPLACE FUNCTION public.staff_create_event(
  p_staff_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_date date DEFAULT NULL,
  p_team_required boolean DEFAULT false
)
RETURNS TABLE(evt_id uuid, evt_title text, evt_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT COALESCE(NULLIF(s.department, ''), s.name) INTO v_name
  FROM public.staff s WHERE s.id = p_staff_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;
  IF NULLIF(btrim(coalesce(p_title, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  RETURN QUERY
  INSERT INTO public.events AS e (title, description, date, team_required, status, created_by)
  VALUES (btrim(p_title), NULLIF(btrim(coalesce(p_description, '')), ''), p_date,
          COALESCE(p_team_required, false), 'pending_approval', v_name)
  RETURNING e.id, e.title, e.status;
END;
$$;