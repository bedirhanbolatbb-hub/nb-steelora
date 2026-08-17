-- =====================================================================
-- NB Steelora — Supabase taşıma paketi · 02 RLS ve POLİTİKALAR
-- 01-schema.sql çalıştırıldıktan SONRA koşulur.
--
-- Kaynak projeden birebir çıkarıldı (pg_policies). Prensip:
--   • Vitrin verisi (ürün, koleksiyon, kampanya, blog, yorum) anon okur.
--   • Kişisel veri (sipariş, profil, adres, fatura, favori) yalnız sahibine.
--   • Analitik, rıza, kargo ve senkron tabloları anon'a TAMAMEN kapalı;
--     yalnız service_role (sunucu uçları) erişir.
-- =====================================================================

-- Tüm tablolarda RLS açık -------------------------------------------------
ALTER TABLE public.products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_billing           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_regions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_product_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs           ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Vitrin okuması
-- =====================================================================

CREATE POLICY "Anyone can read active campaigns" ON public.campaigns
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read" ON public.collections
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service write" ON public.collections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read homepage_settings" ON public.homepage_settings
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read approved reviews" ON public.reviews
  FOR SELECT USING (is_approved = true);

-- =====================================================================
-- Sipariş ve talepler
-- =====================================================================

CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (
    ((SELECT auth.uid()) = user_id)
    OR (guest_email = ((SELECT auth.jwt()) ->> 'email'))
  );

CREATE POLICY "allow_insert_orders" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own requests" ON public.order_requests
  FOR SELECT USING (
    order_id IN (SELECT orders.id FROM public.orders WHERE orders.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can insert own requests" ON public.order_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_requests.order_id AND o.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================================
-- Kullanıcıya ait kayıtlar
-- =====================================================================

CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users own addresses" ON public.user_addresses
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users own billing" ON public.user_billing
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users manage own wishlist" ON public.wishlists
  FOR ALL USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- =====================================================================
-- Yalnız sunucu (service_role) erişimi — politika YOK, yetki REVOKE
-- Bu tablolara anon/authenticated hiçbir şekilde erişemez; uygulama
-- service_role ile (guard'lı API uçlarından) okur/yazar.
-- =====================================================================

REVOKE ALL ON public.analytics_events        FROM anon, authenticated;
REVOKE ALL ON public.analytics_daily         FROM anon, authenticated;
REVOKE ALL ON public.analytics_product_daily FROM anon, authenticated;
REVOKE ALL ON public.consent_logs            FROM anon, authenticated;
REVOKE ALL ON public.shipments               FROM anon, authenticated;
REVOKE ALL ON public.shipment_events         FROM anon, authenticated;
REVOKE ALL ON public.carrier_regions         FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.analytics_events_id_seq FROM anon, authenticated;

-- order_requests üzerinde anon DML kapalı (kaynakta da böyleydi)
REVOKE INSERT, UPDATE, DELETE ON public.order_requests FROM anon;

-- =====================================================================
-- DOĞRULAMA: aşağıdaki sorgu kaynak projedekiyle aynı sonucu vermeli
--   products 0 · collections 2 · campaigns 1 · homepage_settings 1
--   orders 2 · order_requests 2 · reviews 1 · user_profiles 3
--   user_addresses 1 · user_billing 1 · wishlists 1 · diğerleri 0
-- =====================================================================
-- SELECT tablename, count(*) FROM pg_policies WHERE schemaname='public'
-- GROUP BY tablename ORDER BY tablename;
