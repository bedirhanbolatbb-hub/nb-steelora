-- Idempotent stock deduction marker (payment callback)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_deducted_at timestamptz NULL;

COMMENT ON COLUMN public.orders.stock_deducted_at IS 'Set when line-item stock has been decremented for this order; prevents duplicate callback from deducting again.';
