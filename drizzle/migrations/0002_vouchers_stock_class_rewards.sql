-- =============================================================================
-- CampCredit — vouchers, per-class stock, class rewards, staff-private penalties
-- CREDITS vs REPUTATION is unchanged: credits (point_ledger) are spent here,
-- reputation (achievements) is never touched by a redemption.
-- =============================================================================

/* 1. Rewards gain a "uses" display field and optional voucher fine-print. */
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS uses_label text NOT NULL DEFAULT '1 use';
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS voucher_note text NOT NULL DEFAULT '';

/* 2. Redemptions become vouchers: status is 'issued' | 'used' (no approval
      queue any more). Each row carries a unique "CC-XXXX-XXXX" code. */
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS voucher_code text;
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS voucher_note text NOT NULL DEFAULT '';
ALTER TABLE public.redemptions ALTER COLUMN status SET DEFAULT 'issued';
ALTER TABLE public.redemptions DROP CONSTRAINT IF EXISTS redemptions_status_check;

-- Unambiguous alphabet (no O/0/I/1) so codes can be read out loud at a counter.
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public'
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := 'CC-';
    FOR i IN 1..8 LOOP
      IF i = 5 THEN code := code || '-'; END IF;
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.redemptions r WHERE r.voucher_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- Backfill old approval-era rows onto the new voucher model.
UPDATE public.redemptions SET status = 'issued' WHERE status = 'pending';
UPDATE public.redemptions SET status = 'used' WHERE status = 'fulfilled';

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.redemptions WHERE voucher_code IS NULL LOOP
    UPDATE public.redemptions SET voucher_code = public.generate_voucher_code() WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.redemptions
  ADD CONSTRAINT redemptions_status_check CHECK (status IN ('issued', 'used'));

CREATE UNIQUE INDEX IF NOT EXISTS redemptions_voucher_code_key
  ON public.redemptions (voucher_code);

/* 3. PER-CLASS STOCK. Stock is held per (reward, class) pair — one class
      selling out never affects another. NULL remaining_stock = unlimited. */
CREATE TABLE IF NOT EXISTS public.reward_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id uuid NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  remaining_stock integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reward_id, class_id)
);

GRANT SELECT ON public.reward_stock TO anon;
GRANT SELECT ON public.reward_stock TO authenticated;
GRANT ALL ON public.reward_stock TO service_role;
ALTER TABLE public.reward_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reward stock is viewable by everyone" ON public.reward_stock;
CREATE POLICY "Reward stock is viewable by everyone"
  ON public.reward_stock FOR SELECT TO public USING (true);

/* 4. CLASS-LEVEL REWARDS — top classes earn a store discount for their members. */
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS active_discount_percent integer NOT NULL DEFAULT 0;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS discount_expires_at timestamptz;

/* 5. FLAW H — penalties record which staff member applied them, so only that
      staff member can browse them. Interim scope-down: the real long-term fix
      is a role system (e.g. a "discipline committee" role). */
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS created_by_staff_id uuid REFERENCES public.staff(id);

/* 6. ACADEMIC EARNING TIERS — synced twice a year (once per semester) by the
      exam cell, never monthly. Single source of truth for the future
      exam-cell integration:
        SGPA 9.00+        -> 300 credits
        SGPA 8.00 - 8.99  -> 200 credits
        SGPA 7.00 - 7.99  -> 120 credits
        SGPA 6.00 - 6.99  ->  60 credits
        SGPA below 6.00   ->   0 credits */
CREATE OR REPLACE FUNCTION public.academic_points_for_sgpa(p_sgpa numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_sgpa >= 9 THEN 300
    WHEN p_sgpa >= 8 THEN 200
    WHEN p_sgpa >= 7 THEN 120
    WHEN p_sgpa >= 6 THEN 60
    ELSE 0
  END;
$$;

/* 7. The student's own class discount (active + not expired). */
CREATE OR REPLACE FUNCTION public.student_class_discount(p_student_id uuid)
RETURNS TABLE(discount_percent integer, expires_at timestamptz, class_rank integer, class_label text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_class public.classes%ROWTYPE;
BEGIN
  SELECT c.* INTO v_class
  FROM public.classes c
  JOIN public.students s
    ON s.section = c.section AND s.branch = c.branch AND s.year = c.year
  WHERE s.id = p_student_id;

  IF v_class.id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    CASE WHEN v_class.discount_expires_at IS NOT NULL AND v_class.discount_expires_at > now()
         THEN v_class.active_discount_percent ELSE 0 END,
    v_class.discount_expires_at,
    (SELECT cl.rank FROM public.class_leaderboard() cl WHERE cl.id = v_class.id),
    v_class.branch || '-' || v_class.section;
END;
$$;

/* 8. INSTANT REDEEM — balance + per-class stock checked and applied together,
      then a voucher is issued immediately. No staff approval step. */
DROP FUNCTION IF EXISTS public.redeem_reward(uuid, uuid);
CREATE FUNCTION public.redeem_reward(p_student_id uuid, p_reward_id uuid)
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
  v_discount integer := 0;
  v_stock_id uuid;
  v_remaining integer;
BEGIN
  SELECT s.credit_balance INTO v_balance FROM public.students s WHERE s.id = p_student_id;
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT false, 'Unknown student', NULL::uuid, NULL::text; RETURN;
  END IF;

  SELECT r.points_cost, r.name, r.voucher_note INTO v_cost, v_name, v_note
  FROM public.rewards r WHERE r.id = p_reward_id AND r.active;
  IF v_cost IS NULL THEN
    RETURN QUERY SELECT false, 'Reward is not available', NULL::uuid, NULL::text; RETURN;
  END IF;

  -- Which class does this student belong to? Stock and discounts are per class.
  SELECT c.id,
         CASE WHEN c.discount_expires_at IS NOT NULL AND c.discount_expires_at > now()
              THEN c.active_discount_percent ELSE 0 END
    INTO v_class_id, v_discount
  FROM public.classes c
  JOIN public.students s ON s.section = c.section AND s.branch = c.branch AND s.year = c.year
  WHERE s.id = p_student_id;

  v_discount := COALESCE(v_discount, 0);
  v_final_cost := GREATEST(0, CEIL(v_cost * (100 - v_discount) / 100.0)::int);

  -- Stock check + decrement, locked so two students cannot take the last one.
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

  -- Credits only. Reputation/standing is untouched by spending.
  INSERT INTO public.point_ledger (student_id, source, points, description)
  VALUES (p_student_id, 'spend', -v_final_cost, 'Redeemed: ' || v_name);

  RETURN QUERY SELECT true, 'Voucher issued · ' || v_code, v_red_id, v_code;
END;
$$;

/* 9. Student-facing voucher list. */
DROP FUNCTION IF EXISTS public.my_redemptions(uuid);
CREATE FUNCTION public.my_redemptions(p_student_id uuid)
RETURNS TABLE(id uuid, reward_name text, points_cost integer, status text,
              voucher_code text, voucher_note text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id, r.reward_name, r.points_cost, r.status, r.voucher_code, r.voucher_note, r.created_at
  FROM public.redemptions r
  WHERE r.student_id = p_student_id
  ORDER BY (r.status = 'issued') DESC, r.created_at DESC;
$$;

/* 10. Staff voucher desk — search by code or student, mark a voucher used. */
CREATE OR REPLACE FUNCTION public.staff_vouchers(p_staff_id uuid, p_query text DEFAULT '')
RETURNS TABLE(id uuid, student_name text, enrollment_number text, reward_name text,
              points_cost integer, status text, voucher_code text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_q text := btrim(coalesce(p_query, ''));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;

  RETURN QUERY
  SELECT r.id, st.name, st.enrollment_number, r.reward_name, r.points_cost,
         r.status, r.voucher_code, r.created_at
  FROM public.redemptions r
  JOIN public.students st ON st.id = r.student_id
  WHERE v_q = ''
     OR r.voucher_code ILIKE '%' || v_q || '%'
     OR st.name ILIKE '%' || v_q || '%'
     OR st.enrollment_number ILIKE '%' || v_q || '%'
  ORDER BY (r.status = 'issued') DESC, r.created_at DESC
  LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_mark_voucher_used(p_staff_id uuid, p_redemption_id uuid)
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
  SET status = 'used', updated_at = now()
  WHERE r.id = p_redemption_id AND r.status = 'issued'
  RETURNING r.id, r.status;
END;
$$;

/* 11. Event award cap lowered to 400 — matches the new top event preset
       (State/National-level win, 300-400). */
CREATE OR REPLACE FUNCTION public.staff_award_points(p_staff_id uuid, p_student_id uuid, p_event_id uuid, p_points integer, p_description text)
RETURNS TABLE(ledger_id uuid, ledger_points integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_desc text;
  v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students st WHERE st.id = p_student_id) THEN
    RAISE EXCEPTION 'Unknown student';
  END IF;
  IF coalesce(p_points, 0) = 0 THEN
    RAISE EXCEPTION 'Points must be non-zero';
  END IF;
  IF abs(p_points) > 400 THEN
    RAISE EXCEPTION 'Event awards are capped at 400 points';
  END IF;

  v_desc := COALESCE(NULLIF(btrim(coalesce(p_description, '')), ''),
                     COALESCE((SELECT e.title FROM public.events e WHERE e.id = p_event_id), 'Event participation'));

  INSERT INTO public.point_ledger (student_id, source, points, description)
  VALUES (p_student_id, 'event', p_points, v_desc)
  RETURNING id INTO v_id;

  INSERT INTO public.achievements (student_id, points, citation, source, is_private)
  VALUES (p_student_id, p_points, v_desc, 'event', false);

  RETURN QUERY SELECT v_id, p_points;
END;
$$;

/* 12. Penalties now record their author (Flaw H). */
CREATE OR REPLACE FUNCTION public.apply_penalty(p_staff_id uuid, p_student_id uuid, p_points integer, p_reason text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students st WHERE st.id = p_student_id) THEN
    RAISE EXCEPTION 'Unknown student';
  END IF;
  IF coalesce(p_points, 0) >= 0 THEN
    RAISE EXCEPTION 'A penalty must be a negative number of points';
  END IF;
  IF btrim(coalesce(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'A reason is required for a penalty';
  END IF;

  -- Penalties only reduce reputation. Credits are never touched.
  INSERT INTO public.achievements (student_id, points, citation, source, is_private, created_by_staff_id)
  VALUES (p_student_id, p_points, btrim(p_reason), 'penalty', true, p_staff_id);

  RETURN QUERY SELECT true, 'Penalty applied';
END;
$$;

-- Only the staff member who applied a penalty can list it back. Filtered in
-- SQL, not in the UI. Long term this becomes a role check (discipline
-- committee) rather than author-only visibility.
CREATE OR REPLACE FUNCTION public.staff_my_penalties(p_staff_id uuid)
RETURNS TABLE(id uuid, student_name text, enrollment_number text, points integer,
              citation text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;

  RETURN QUERY
  SELECT a.id, st.name, st.enrollment_number, a.points, a.citation, a.created_at
  FROM public.achievements a
  JOIN public.students st ON st.id = a.student_id
  WHERE a.source = 'penalty'
    AND a.created_by_staff_id = p_staff_id
  ORDER BY a.created_at DESC
  LIMIT 100;
END;
$$;

/* 13. CLASS REWARDS — staff-triggered. Ranks classes by reputation-based
       normalized_score and grants the top 5 a store discount.
       1st: 20% / 30d · 2nd: 15% / 30d · 3rd: 10% / 30d · 4th-5th: 5% / 14d */
CREATE OR REPLACE FUNCTION public.apply_class_rewards(p_staff_id uuid)
RETURNS TABLE(class_label text, discount_percent integer, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = p_staff_id) THEN
    RAISE EXCEPTION 'Unknown staff account';
  END IF;

  PERFORM public.recompute_campus_stats();

  -- Clear the previous term's grants before re-granting.
  UPDATE public.classes SET active_discount_percent = 0, discount_expires_at = NULL;

  RETURN QUERY
  WITH ranked AS (
    SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.normalized_score DESC, c.branch, c.section) AS pos
    FROM public.classes c
  ), grants AS (
    SELECT id,
           CASE pos WHEN 1 THEN 20 WHEN 2 THEN 15 WHEN 3 THEN 10 ELSE 5 END AS pct,
           CASE WHEN pos <= 3 THEN now() + interval '30 days' ELSE now() + interval '14 days' END AS exp
    FROM ranked WHERE pos <= 5
  )
  UPDATE public.classes c
  SET active_discount_percent = g.pct, discount_expires_at = g.exp
  FROM grants g
  WHERE c.id = g.id
  RETURNING c.branch || '-' || c.section, c.active_discount_percent, c.discount_expires_at;
END;
$$;