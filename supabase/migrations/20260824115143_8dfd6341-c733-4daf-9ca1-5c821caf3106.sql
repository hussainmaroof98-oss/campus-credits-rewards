CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  team_name text,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, student_id)
);

GRANT ALL ON public.event_registrations TO service_role;

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Students authenticate through the placeholder `student_login` flow (no Supabase
-- auth user yet), so there is no auth.uid() to scope rows by. Direct client access
-- is therefore denied entirely; all access goes through the security-definer
-- functions below, which scope every row to the calling student's id.
CREATE POLICY "No direct client access to event registrations"
  ON public.event_registrations FOR SELECT USING (false);

CREATE TRIGGER event_registrations_set_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.register_for_event(
  p_student_id uuid,
  p_event_id uuid,
  p_team_name text DEFAULT NULL
)
RETURNS TABLE(id uuid, event_id uuid, student_id uuid, team_name text, status text, created_at timestamptz)
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

CREATE OR REPLACE FUNCTION public.my_event_registrations(p_student_id uuid)
RETURNS TABLE(
  id uuid, event_id uuid, team_name text, status text, created_at timestamptz,
  title text, description text, date date, team_required boolean, event_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id, r.event_id, r.team_name, r.status, r.created_at,
         e.title, e.description, e.date, e.team_required, e.status
  FROM public.event_registrations r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.student_id = p_student_id
  ORDER BY e.date NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.event_teammates(p_event_id uuid, p_team_name text)
RETURNS TABLE(student_id uuid, name text, team_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, r.team_name
  FROM public.event_registrations r
  JOIN public.students s ON s.id = r.student_id
  WHERE r.event_id = p_event_id
    AND r.status = 'registered'
    AND lower(btrim(coalesce(r.team_name, ''))) = lower(btrim(coalesce(p_team_name, '')))
    AND btrim(coalesce(p_team_name, '')) <> ''
  ORDER BY r.created_at;
$$;