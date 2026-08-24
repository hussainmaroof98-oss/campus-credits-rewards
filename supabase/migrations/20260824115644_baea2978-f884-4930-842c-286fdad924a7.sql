CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Staff accounts (teachers / club heads). Placeholder auth, same pattern as students.
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_code text NOT NULL UNIQUE,
  name text NOT NULL,
  department text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to staff" ON public.staff FOR SELECT USING (false);

CREATE TRIGGER staff_set_updated_at BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.staff (staff_code, name, department, password_hash) VALUES
  ('T-CSE-04', 'Dr. Meera Iyer', 'CSE Department · Coding Club', extensions.crypt('staff1234', extensions.gen_salt('bf'))),
  ('T-NSS-01', 'Prof. Rajat Verma', 'NSS · Student Welfare', extensions.crypt('staff1234', extensions.gen_salt('bf'))),
  ('T-CUL-07', 'Ms. Ananya Rao', 'Cultural Committee', extensions.crypt('staff1234', extensions.gen_salt('bf')));

-- Allow rejected events
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check
  CHECK (status IN ('pending_approval', 'live', 'completed', 'rejected'));

-- PLACEHOLDER AUTHORIZATION -------------------------------------------------
-- staff_login only proves "this staff code + password matches". None of the
-- staff_* functions below check that the staff member owns the club/event they
-- act on; real per-club scoping arrives when staff accounts are provisioned by
-- the university.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.staff_login(p_staff_code text, p_password text)
RETURNS TABLE(id uuid, staff_code text, name text, department text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.staff_code, s.name, s.department
  FROM public.staff s
  WHERE upper(s.staff_code) = upper(trim(coalesce(p_staff_code, '')))
    AND coalesce(p_password, '') <> ''
    AND s.password_hash = extensions.crypt(p_password, s.password_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_approve_event(p_staff_id uuid, p_event_id uuid, p_approve boolean)
RETURNS TABLE(evt_id uuid, evt_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- PLACEHOLDER AUTHORIZATION: only checks the staff account exists.
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;

  RETURN QUERY
  UPDATE public.events AS e
  SET status = CASE WHEN p_approve THEN 'live' ELSE 'rejected' END
  WHERE e.id = p_event_id AND e.status = 'pending_approval'
  RETURNING e.id, e.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_award_points(
  p_staff_id uuid, p_student_id uuid, p_event_id uuid, p_points integer, p_description text
)
RETURNS TABLE(ledger_id uuid, ledger_points integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- PLACEHOLDER AUTHORIZATION: only checks the staff account exists.
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students st WHERE st.id = p_student_id) THEN
    RAISE EXCEPTION 'Unknown student';
  END IF;
  IF coalesce(p_points, 0) = 0 THEN
    RAISE EXCEPTION 'Points must be non-zero';
  END IF;

  RETURN QUERY
  INSERT INTO public.point_ledger AS p (student_id, source, points, description)
  VALUES (
    p_student_id,
    'event',
    p_points,
    COALESCE(NULLIF(btrim(coalesce(p_description, '')), ''),
             COALESCE((SELECT e.title FROM public.events e WHERE e.id = p_event_id), 'Event participation'))
  )
  RETURNING p.id, p.points;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_event_registrations(p_staff_id uuid, p_event_id uuid)
RETURNS TABLE(
  registration_id uuid, student_id uuid, student_name text, enrollment_number text,
  branch text, section text, year integer, team_name text, reg_status text, credit_balance integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- PLACEHOLDER AUTHORIZATION: only checks the staff account exists.
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;

  RETURN QUERY
  SELECT r.id, s.id, s.name, s.enrollment_number, s.branch, s.section, s.year,
         r.team_name, r.status, s.credit_balance
  FROM public.event_registrations r
  JOIN public.students s ON s.id = r.student_id
  WHERE r.event_id = p_event_id
  ORDER BY COALESCE(r.team_name, ''), s.name;
END;
$$;