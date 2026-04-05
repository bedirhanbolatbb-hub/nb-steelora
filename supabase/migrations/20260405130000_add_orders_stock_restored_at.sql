-- Stock restore marker (admin cancel)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_restored_at timestamptz NULL;

COMMENT ON COLUMN public.orders.stock_restored_at IS 'Set when line-item stock has been restored after cancel; prevents duplicate restore.';
