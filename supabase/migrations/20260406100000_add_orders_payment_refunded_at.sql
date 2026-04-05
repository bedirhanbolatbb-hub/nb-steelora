-- Marks successful iyzico refund so admin cancel cannot refund twice on retry
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_refunded_at timestamptz NULL;

COMMENT ON COLUMN public.orders.payment_refunded_at IS 'Set when iyzico refund API succeeded; prevents duplicate refunds on cancel retry.';
