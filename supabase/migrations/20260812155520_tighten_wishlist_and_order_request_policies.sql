-- Kapatılan iki açık:
--
-- 1) wishlists "Users manage own wishlist": USING/WITH CHECK içindeki
--    OR (guest_id IS NOT NULL) dalı, guest_id dolu her satırı tüm anon
--    istemcilere okuma/yazma açıyordu (satır sahipliği kontrol edilmiyordu).
--    Misafir listesi zaten localStorage'da tutuluyor ve syncWithServer hiç
--    çağrılmıyor, bu yüzden dal tamamen kaldırıldı; çerez tabanlı bir misafir
--    kimliğine gerek yok.
--
-- 2) order_requests "Users can insert own requests": WITH CHECK yalnızca
--    order_id'nin kullanıcıya ait olmasını arıyordu, user_id sütununu
--    kısıtlamıyordu. Kullanıcı kendi siparişine başkasının user_id'siyle
--    kayıt atabiliyordu. Politika 20260407120000_order_requests.sql
--    dosyasındaki sıkı sürüme çekildi (user_id = auth.uid() AND EXISTS ...),
--    rol kapsamı da aynı dosyadaki gibi authenticated'a daraltıldı.
--
-- auth.uid() çağrıları 20260812120000 ile aynı biçimde (select auth.uid())
-- olarak sarmalandı ki auth_rls_initplan uyarısı geri gelmesin.

-- 1) Misafir dalını kaldır ---------------------------------------------------

ALTER POLICY "Users manage own wishlist" ON public.wishlists
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 2) order_requests insert politikasını sıkılaştır ---------------------------

ALTER POLICY "Users can insert own requests" ON public.order_requests
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_id
        AND o.user_id = (select auth.uid())
    )
  );
