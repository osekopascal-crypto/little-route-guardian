CREATE TABLE public.fee_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_label text NOT NULL,
  amount_kes numeric(12,2) NOT NULL CHECK (amount_kes > 0),
  due_date date NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fee_invoices_school_idx ON public.fee_invoices (school_id, due_date DESC);
CREATE INDEX fee_invoices_student_idx ON public.fee_invoices (student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_invoices TO authenticated;
GRANT ALL ON public.fee_invoices TO service_role;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage school invoices" ON public.fee_invoices
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin')
  WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin');

CREATE POLICY "parents read own children invoices" ON public.fee_invoices
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id() AND public.is_my_child(student_id));

CREATE TRIGGER fee_invoices_touch BEFORE UPDATE ON public.fee_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.fee_invoices(id) ON DELETE CASCADE,
  amount_kes numeric(12,2) NOT NULL CHECK (amount_kes > 0),
  method text NOT NULL DEFAULT 'mpesa' CHECK (method IN ('mpesa','cash','bank','other')),
  reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fee_payments_invoice_idx ON public.fee_payments (invoice_id, paid_at DESC);
CREATE INDEX fee_payments_school_idx ON public.fee_payments (school_id, paid_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_payments TO authenticated;
GRANT ALL ON public.fee_payments TO service_role;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage school payments" ON public.fee_payments
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin')
  WITH CHECK (school_id = public.get_user_school_id() AND public.get_user_role() = 'admin');

CREATE POLICY "parents read own children payments" ON public.fee_payments
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_user_school_id()
    AND EXISTS (
      SELECT 1 FROM public.fee_invoices i
      WHERE i.id = invoice_id AND public.is_my_child(i.student_id)
    )
  );

CREATE OR REPLACE FUNCTION public.fee_payments_enforce_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE inv record;
BEGIN
  SELECT school_id, student_id INTO inv FROM public.fee_invoices WHERE id = NEW.invoice_id;
  IF inv.school_id IS NULL THEN
    RAISE EXCEPTION 'invoice not found';
  END IF;
  NEW.school_id := inv.school_id;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.fee_payments_enforce_tenant() FROM anon, authenticated, public;

CREATE TRIGGER fee_payments_tenant BEFORE INSERT OR UPDATE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.fee_payments_enforce_tenant();

CREATE OR REPLACE FUNCTION public.notify_fee_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE inv record; s record;
BEGIN
  SELECT school_id, student_id, term_label INTO inv FROM public.fee_invoices WHERE id = NEW.invoice_id;
  SELECT first_name || ' ' || last_name AS full_name INTO s FROM public.students WHERE id = inv.student_id;

  INSERT INTO public.notifications (school_id, recipient_id, kind, title, body, student_id)
  SELECT inv.school_id, sg.guardian_id, 'payment',
         'Transport payment received',
         'KES ' || to_char(NEW.amount_kes, 'FM999,999,990.00') || ' received for ' || coalesce(s.full_name, 'your child') || ' (' || inv.term_label || '). Thank you.',
         inv.student_id
  FROM public.student_guardians sg
  WHERE sg.student_id = inv.student_id;

  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_fee_payment() FROM anon, authenticated, public;

CREATE TRIGGER fee_payments_notify AFTER INSERT ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_fee_payment();