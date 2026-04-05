-- Customer order requests (cancel / return). UI and API are added separately.
-- Service role bypasses RLS and can access all rows (admin/server routes).

CREATE TABLE public.order_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('cancel', 'return')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.order_requests IS 'Customer-initiated cancel/return requests; fulfillment stays on orders.status.';

-- At most one row with status = pending per order (allows new request after approve/reject).
CREATE UNIQUE INDEX order_requests_one_pending_per_order
  ON public.order_requests (order_id)
  WHERE (status = 'pending');

CREATE OR REPLACE FUNCTION public.set_order_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_requests_set_updated_at
  BEFORE UPDATE ON public.order_requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_order_requests_updated_at();

ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_requests_select_own"
  ON public.order_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "order_requests_insert_own_order"
  ON public.order_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_id
        AND o.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.order_requests TO authenticated;
GRANT ALL ON public.order_requests TO service_role;
