-- Sync toplu upsert'i için çakışma hedefi.
-- Additive: mevcut kolon/kısıtlara dokunulmaz. Barkodlar uygulama öncesinde
-- 520/520 tekil olarak doğrulandı.
CREATE UNIQUE INDEX IF NOT EXISTS products_trendyol_barcode_key
  ON public.products (trendyol_barcode);

COMMENT ON INDEX public.products_trendyol_barcode_key IS
  'Sync toplu upsert çakışma hedefi (on_conflict=trendyol_barcode).';
