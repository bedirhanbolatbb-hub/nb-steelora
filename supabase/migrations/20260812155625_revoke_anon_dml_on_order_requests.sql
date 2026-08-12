-- order_requests üzerinde anon rolünün yazma grant'leri kaldırılıyor.
--
-- RLS zaten engelliyordu: UPDATE/DELETE için hiç politika yok, INSERT politikası
-- da artık authenticated'a kapsamlı ve user_id = auth.uid() arıyor. Bu adım
-- derinlemesine savunma; 20260407120000_order_requests.sql yalnızca
-- authenticated'a SELECT + INSERT veriyor, canlıdaki grant'ler onunla uyumsuzdu.
--
-- anon SELECT bilerek dokunulmadan bırakıldı; kapsam yazma yetkileriyle sınırlı.

REVOKE INSERT, UPDATE, DELETE ON public.order_requests FROM anon;
