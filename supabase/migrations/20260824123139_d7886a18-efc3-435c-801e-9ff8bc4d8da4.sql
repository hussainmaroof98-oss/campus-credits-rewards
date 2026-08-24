CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  points_cost integer NOT NULL CHECK (points_cost > 0),
  icon text NOT NULL DEFAULT 'gift',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rewards TO anon;
GRANT SELECT ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rewards are viewable by everyone" ON public.rewards FOR SELECT USING (true);

CREATE TRIGGER rewards_set_updated_at BEFORE UPDATE ON public.rewards
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.rewards (name, description, points_cost, icon) VALUES
  ('Canteen Meal Voucher', 'One full meal at the main campus canteen.', 300, 'utensils'),
  ('Campus Hoodie', 'Official CampCredit-edition college hoodie.', 900, 'shirt'),
  ('Library Late-Fee Waiver', 'Clears up to Rs.200 of library late fees.', 250, 'book-open'),
  ('Priority Lab Booking Slot', 'First pick on next week''s lab slots.', 400, 'flask-conical'),
  ('Event Fast-Pass', 'Skip the queue at the next campus event.', 200, 'ticket'),
  ('Stationery Store Discount', '20% off at the campus stationery store.', 150, 'pencil'),
  ('Cafe Combo Voucher', 'Coffee plus a snack at the campus cafe.', 180, 'coffee'),
  ('Internship Interview Priority', 'Priority interview slot with a placement partner.', 2000, 'briefcase');

CREATE OR REPLACE FUNCTION public.redeem_reward(p_student_id uuid, p_reward_id uuid)
RETURNS TABLE(ok boolean, message text, redemption_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance integer;
  v_cost integer;
  v_name text;
  v_red_id uuid;
BEGIN
  SELECT s.credit_balance INTO v_balance FROM public.students s WHERE s.id = p_student_id;
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT false, 'Unknown student', NULL::uuid; RETURN;
  END IF;

  SELECT r.points_cost, r.name INTO v_cost, v_name
  FROM public.rewards r WHERE r.id = p_reward_id AND r.active;
  IF v_cost IS NULL THEN
    RETURN QUERY SELECT false, 'Reward is not available', NULL::uuid; RETURN;
  END IF;

  IF v_balance < v_cost THEN
    RETURN QUERY SELECT false, 'Not enough credits', NULL::uuid; RETURN;
  END IF;

  INSERT INTO public.redemptions (student_id, reward_name, points_cost, status)
  VALUES (p_student_id, v_name, v_cost, 'pending')
  RETURNING id INTO v_red_id;

  INSERT INTO public.point_ledger (student_id, source, points, description)
  VALUES (p_student_id, 'spend', -v_cost, 'Redeemed: ' || v_name);

  RETURN QUERY SELECT true, 'Redeemed ' || v_name, v_red_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_redemptions(p_student_id uuid)
RETURNS TABLE(id uuid, reward_name text, points_cost integer, status text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id, r.reward_name, r.points_cost, r.status, r.created_at
  FROM public.redemptions r
  WHERE r.student_id = p_student_id
  ORDER BY r.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.staff_pending_redemptions(p_staff_id uuid)
RETURNS TABLE(id uuid, student_name text, enrollment_number text, reward_name text, points_cost integer, status text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- PLACEHOLDER AUTHORIZATION: only checks the staff account exists.
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;

  RETURN QUERY
  SELECT r.id, st.name, st.enrollment_number, r.reward_name, r.points_cost, r.status, r.created_at
  FROM public.redemptions r
  JOIN public.students st ON st.id = r.student_id
  ORDER BY (r.status = 'pending') DESC, r.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_fulfill_redemption(p_staff_id uuid, p_redemption_id uuid)
RETURNS TABLE(red_id uuid, red_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- PLACEHOLDER AUTHORIZATION: only checks the staff account exists.
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;

  RETURN QUERY
  UPDATE public.redemptions AS r
  SET status = 'fulfilled'
  WHERE r.id = p_redemption_id AND r.status = 'pending'
  RETURNING r.id, r.status;
END;
$$;