CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  branch TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 1,
  password_hash TEXT NOT NULL,
  credit_balance INTEGER NOT NULL DEFAULT 0,
  personal_rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to students" ON public.students FOR SELECT USING (false);

CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL,
  branch TEXT NOT NULL,
  year INTEGER NOT NULL,
  normalized_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch, section, year)
);
GRANT SELECT ON public.classes TO anon, authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Classes are viewable by everyone" ON public.classes FOR SELECT USING (true);

CREATE TABLE public.point_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('academic', 'event', 'spend')),
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX point_ledger_student_id_idx ON public.point_ledger (student_id, created_at DESC);
GRANT SELECT ON public.point_ledger TO anon, authenticated;
GRANT ALL ON public.point_ledger TO service_role;
ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ledger entries are viewable by everyone" ON public.point_ledger FOR SELECT USING (true);

CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  team_required BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'live', 'completed')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);

CREATE TABLE public.redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reward_name TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.redemptions TO anon, authenticated;
GRANT ALL ON public.redemptions TO service_role;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Redemptions are viewable by everyone" ON public.redemptions FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER students_set_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER classes_set_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER redemptions_set_updated_at BEFORE UPDATE ON public.redemptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PLACEHOLDER AUTH: verifies the demo password hash and returns the student
-- profile without any password data. Replaced by university SSO/LDAP later.
CREATE OR REPLACE FUNCTION public.student_login(p_enrollment_number TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  enrollment_number TEXT,
  name TEXT,
  section TEXT,
  branch TEXT,
  year INTEGER,
  credit_balance INTEGER,
  personal_rank INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.enrollment_number, s.name, s.section, s.branch, s.year, s.credit_balance, s.personal_rank
  FROM public.students s
  WHERE upper(s.enrollment_number) = upper(trim(coalesce(p_enrollment_number, '')))
    AND coalesce(p_password, '') <> ''
    AND s.password_hash = extensions.crypt(p_password, s.password_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.student_login(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_login(TEXT, TEXT) TO anon, authenticated;

INSERT INTO public.classes (section, branch, year, normalized_score) VALUES
  ('A', 'BTech CSE', 2, 72),
  ('B', 'BTech CSE', 2, 76),
  ('C', 'BTech CSE', 2, 64),
  ('A', 'BTech ECE', 2, 68);

INSERT INTO public.students (enrollment_number, name, section, branch, year, password_hash, credit_balance, personal_rank) VALUES
  ('2023CSE042', 'Aarav Mehta', 'A', 'BTech CSE', 2, extensions.crypt('campus1234', extensions.gen_salt('bf')), 2480, 12),
  ('2023CSE017', 'Diya Sharma', 'A', 'BTech CSE', 2, extensions.crypt('campus1234', extensions.gen_salt('bf')), 3120, 4),
  ('2023CSE088', 'Rohan Iyer', 'B', 'BTech CSE', 2, extensions.crypt('campus1234', extensions.gen_salt('bf')), 2890, 7),
  ('2023CSE105', 'Ananya Nair', 'C', 'BTech CSE', 2, extensions.crypt('campus1234', extensions.gen_salt('bf')), 1980, 31),
  ('2023ECE023', 'Kabir Singh', 'A', 'BTech ECE', 2, extensions.crypt('campus1234', extensions.gen_salt('bf')), 2210, 19);

INSERT INTO public.point_ledger (student_id, source, points, description, created_at)
SELECT s.id, v.source, v.points, v.description, now() - v.age
FROM public.students s
JOIN (VALUES
  ('2023CSE042', 'event', 200, 'Hackathon — 2nd place · CodeStorm 24h', INTERVAL '2 days'),
  ('2023CSE042', 'event', 40, 'Blood donation drive · NSS volunteering', INTERVAL '5 days'),
  ('2023CSE042', 'academic', 500, 'Semester result synced · SGPA 9.1 · Sem 3', INTERVAL '7 days'),
  ('2023CSE042', 'spend', -120, 'Campus cafeteria spend', INTERVAL '9 days'),
  ('2023CSE017', 'academic', 540, 'Semester result synced · SGPA 9.5 · Sem 3', INTERVAL '7 days'),
  ('2023CSE088', 'event', 150, 'Robotics expo — participation', INTERVAL '4 days'),
  ('2023CSE105', 'event', 60, 'Campus cleanliness drive', INTERVAL '3 days'),
  ('2023ECE023', 'academic', 420, 'Semester result synced · SGPA 8.4 · Sem 3', INTERVAL '8 days')
) AS v(enrollment_number, source, points, description, age)
  ON v.enrollment_number = s.enrollment_number;

INSERT INTO public.events (title, description, date, team_required, status, created_by) VALUES
  ('CodeStorm 24h Hackathon', 'Overnight build sprint across all branches.', CURRENT_DATE + 14, true, 'live', 'Tech Council'),
  ('NSS Blood Donation Drive', 'Campus-wide donation camp with the city blood bank.', CURRENT_DATE + 6, false, 'live', 'NSS Unit'),
  ('Inter-section Football Cup', 'Knockout tournament between sections.', CURRENT_DATE + 21, true, 'pending_approval', 'Sports Committee'),
  ('Alumni Tech Talk', 'Career session with 2018 batch alumni.', CURRENT_DATE - 10, false, 'completed', 'Placement Cell');

INSERT INTO public.redemptions (student_id, reward_name, points_cost, status)
SELECT s.id, v.reward_name, v.points_cost, v.status
FROM public.students s
JOIN (VALUES
  ('2023CSE042', 'Canteen meal voucher', 300, 'fulfilled'),
  ('2023CSE042', 'Campus hoodie', 900, 'pending'),
  ('2023CSE017', 'Library late-fee waiver', 250, 'fulfilled')
) AS v(enrollment_number, reward_name, points_cost, status)
  ON v.enrollment_number = s.enrollment_number;