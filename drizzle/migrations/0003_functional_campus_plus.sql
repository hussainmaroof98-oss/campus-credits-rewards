ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS card_skin text NOT NULL DEFAULT 'navy';

ALTER TABLE public.students
ADD CONSTRAINT students_card_skin_check
CHECK (card_skin IN ('navy', 'aurora', 'ember'));

CREATE OR REPLACE FUNCTION public.student_plus_profile(p_student_id uuid)
RETURNS TABLE(is_campus_plus boolean, card_skin text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.is_campus_plus,
         CASE WHEN s.is_campus_plus THEN s.card_skin ELSE 'navy' END
  FROM public.students s
  WHERE s.id = p_student_id;
$$;

CREATE OR REPLACE FUNCTION public.student_set_card_skin(p_student_id uuid, p_card_skin text)
RETURNS TABLE(card_skin text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_card_skin NOT IN ('navy', 'aurora', 'ember') THEN
    RAISE EXCEPTION 'Unknown card skin';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id AND s.is_campus_plus
  ) THEN
    RAISE EXCEPTION 'Campus Plus is required to change card skins';
  END IF;

  RETURN QUERY
  UPDATE public.students s
  SET card_skin = p_card_skin, updated_at = now()
  WHERE s.id = p_student_id
  RETURNING s.card_skin;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_store_discount(p_student_id uuid)
RETURNS TABLE(class_discount_percent integer, plus_discount_percent integer, total_discount_percent integer, expires_at timestamptz, class_rank integer, class_label text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_class public.classes%ROWTYPE;
  v_plus boolean := false;
  v_class_discount integer := 0;
BEGIN
  SELECT s.is_campus_plus INTO v_plus
  FROM public.students s WHERE s.id = p_student_id;

  SELECT c.* INTO v_class
  FROM public.classes c
  JOIN public.students s
    ON s.section = c.section AND s.branch = c.branch AND s.year = c.year
  WHERE s.id = p_student_id;

  IF v_class.id IS NOT NULL AND v_class.discount_expires_at IS NOT NULL AND v_class.discount_expires_at > now() THEN
    v_class_discount := v_class.active_discount_percent;
  END IF;

  RETURN QUERY SELECT
    COALESCE(v_class_discount, 0),
    CASE WHEN COALESCE(v_plus, false) THEN 5 ELSE 0 END,
    LEAST(100, COALESCE(v_class_discount, 0) + CASE WHEN COALESCE(v_plus, false) THEN 5 ELSE 0 END),
    v_class.discount_expires_at,
    CASE WHEN v_class.id IS NULL THEN NULL ELSE (SELECT cl.rank FROM public.class_leaderboard() cl WHERE cl.id = v_class.id) END,
    CASE WHEN v_class.id IS NULL THEN NULL ELSE v_class.branch || '-' || v_class.section END;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_reward(p_student_id uuid, p_reward_id uuid)
RETURNS TABLE(ok boolean, message text, redemption_id uuid, voucher_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance integer;
  v_cost integer;
  v_final_cost integer;
  v_name text;
  v_note text;
  v_red_id uuid;
  v_code text;
  v_class_id uuid;
  v_class_discount integer := 0;
  v_plus_discount integer := 0;
  v_total_discount integer := 0;
  v_stock_id uuid;
  v_remaining integer;
BEGIN
  SELECT s.credit_balance,
         CASE WHEN s.is_campus_plus THEN 5 ELSE 0 END
  INTO v_balance, v_plus_discount
  FROM public.students s WHERE s.id = p_student_id;
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT false, 'Unknown student', NULL::uuid, NULL::text; RETURN;
  END IF;

  SELECT r.points_cost, r.name, r.voucher_note INTO v_cost, v_name, v_note
  FROM public.rewards r WHERE r.id = p_reward_id AND r.active;
  IF v_cost IS NULL THEN
    RETURN QUERY SELECT false, 'Reward is not available', NULL::uuid, NULL::text; RETURN;
  END IF;

  SELECT c.id,
         CASE WHEN c.discount_expires_at IS NOT NULL AND c.discount_expires_at > now()
              THEN c.active_discount_percent ELSE 0 END
    INTO v_class_id, v_class_discount
  FROM public.classes c
  JOIN public.students s ON s.section = c.section AND s.branch = c.branch AND s.year = c.year
  WHERE s.id = p_student_id;

  -- Campus Plus contributes a personal 5% discount. It stacks additively with
  -- the active class discount before the same ceiling-based price calculation.
  v_total_discount := LEAST(100, COALESCE(v_class_discount, 0) + COALESCE(v_plus_discount, 0));
  v_final_cost := GREATEST(0, CEIL(v_cost * (100 - v_total_discount) / 100.0)::int);

  IF v_class_id IS NOT NULL THEN
    SELECT rs.id, rs.remaining_stock INTO v_stock_id, v_remaining
    FROM public.reward_stock rs
    WHERE rs.reward_id = p_reward_id AND rs.class_id = v_class_id
    FOR UPDATE;
    IF v_stock_id IS NOT NULL AND v_remaining IS NOT NULL AND v_remaining <= 0 THEN
      RETURN QUERY SELECT false, 'Sold out for your class', NULL::uuid, NULL::text; RETURN;
    END IF;
  END IF;

  IF v_balance < v_final_cost THEN
    RETURN QUERY SELECT false, 'Not enough credits', NULL::uuid, NULL::text; RETURN;
  END IF;

  IF v_stock_id IS NOT NULL AND v_remaining IS NOT NULL THEN
    UPDATE public.reward_stock SET remaining_stock = remaining_stock - 1 WHERE id = v_stock_id;
  END IF;

  v_code := public.generate_voucher_code();
  INSERT INTO public.redemptions (student_id, reward_name, points_cost, status, voucher_code, voucher_note)
  VALUES (p_student_id, v_name, v_final_cost, 'issued', v_code, COALESCE(v_note, ''))
  RETURNING id INTO v_red_id;

  INSERT INTO public.point_ledger (student_id, source, points, description)
  VALUES (p_student_id, 'spend', -v_final_cost, 'Redeemed: ' || v_name);

  RETURN QUERY SELECT true, 'Voucher issued · ' || v_code, v_red_id, v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_award_points(p_staff_id uuid, p_student_id uuid, p_event_id uuid, p_points integer, p_description text)
RETURNS TABLE(ledger_id uuid, ledger_points integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_desc text;
  v_id uuid;
  v_credit_points integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students st WHERE st.id = p_student_id) THEN
    RAISE EXCEPTION 'Unknown student';
  END IF;
  IF coalesce(p_points, 0) = 0 THEN RAISE EXCEPTION 'Points must be non-zero'; END IF;
  IF abs(p_points) > 400 THEN RAISE EXCEPTION 'Event awards are capped at 400 points'; END IF;

  v_desc := COALESCE(NULLIF(btrim(coalesce(p_description, '')), ''),
                     COALESCE((SELECT e.title FROM public.events e WHERE e.id = p_event_id), 'Event participation'));

  -- CAMPUS PLUS CORE RULE: only earned CREDITS are doubled. The achievement
  -- below uses the original points, so reputation and every rank stay unchanged.
  SELECT CASE WHEN st.is_campus_plus AND p_points > 0 THEN p_points * 2 ELSE p_points END
  INTO v_credit_points FROM public.students st WHERE st.id = p_student_id;

  INSERT INTO public.point_ledger (student_id, source, points, description)
  VALUES (p_student_id, 'event', v_credit_points, v_desc)
  RETURNING id INTO v_id;

  INSERT INTO public.achievements (student_id, points, citation, source, is_private)
  VALUES (p_student_id, p_points, v_desc, 'event', false);

  RETURN QUERY SELECT v_id, v_credit_points;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_academic_credits(p_staff_id uuid, p_student_id uuid, p_sgpa numeric, p_citation text)
RETURNS TABLE(ledger_id uuid, credit_points integer, reputation_points integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base integer;
  v_credits integer;
  v_id uuid;
  v_citation text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students st WHERE st.id = p_student_id) THEN
    RAISE EXCEPTION 'Unknown student';
  END IF;
  v_base := public.academic_points_for_sgpa(p_sgpa);
  v_citation := COALESCE(NULLIF(btrim(COALESCE(p_citation, '')), ''), 'Semester result sync');

  -- CAMPUS PLUS CORE RULE: the membership multiplier applies to CREDITS only.
  -- Reputation records the unmultiplied academic tier and is never pay-to-rank.
  SELECT CASE WHEN st.is_campus_plus THEN v_base * 2 ELSE v_base END
  INTO v_credits FROM public.students st WHERE st.id = p_student_id;

  INSERT INTO public.point_ledger (student_id, source, points, description)
  VALUES (p_student_id, 'academic', v_credits, v_citation)
  RETURNING id INTO v_id;

  IF v_base <> 0 THEN
    INSERT INTO public.achievements (student_id, points, citation, source, is_private)
    VALUES (p_student_id, v_base, v_citation, 'academic', false);
  END IF;

  RETURN QUERY SELECT v_id, v_credits, v_base;
END;
$$;