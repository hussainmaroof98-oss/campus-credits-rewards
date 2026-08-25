ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_campus_plus boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.student_campus_plus_status(p_student_id uuid)
RETURNS TABLE(is_campus_plus boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.is_campus_plus FROM public.students s WHERE s.id = p_student_id;
$$;

-- PLACEHOLDER: instant activation with no real payment. Replaced by the
-- RevenueCat purchase-validation flow once the app is wrapped natively.
CREATE OR REPLACE FUNCTION public.student_subscribe_campus_plus(p_student_id uuid)
RETURNS TABLE(ok boolean, is_campus_plus boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.students s SET is_campus_plus = true, updated_at = now() WHERE s.id = p_student_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_campus_plus_status(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_subscribe_campus_plus(uuid) TO anon, authenticated;