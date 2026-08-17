-- =====================================================================
-- NB Steelora — Supabase taşıma paketi · 05 DOĞRULAMA
-- Taşıma bittikten sonra YENİ projede çalıştırın ve çıkan sayıları
-- aşağıdaki "beklenen" değerlerle karşılaştırın.
--
-- Beklenen değerler 18 Ağustos 2026 envanterinden alınmıştır; taşımadan önce
-- kaynak projede aynı sorguyu koşup güncel sayıları not edin (veri değişmiş
-- olabilir).
-- =====================================================================

-- 1) SATIR SAYILARI --------------------------------------------------------
-- beklenen: products 520 · carrier_regions 312 · sync_log 187 · blog_posts 25
--           site_content 36 · homepage_settings 13 · orders 11 · order_requests 5
--           campaigns 3 · collections 3 · user_* 1'er · wishlists 1
--           analytics_events 64 (taşınmadıysa 0) · diğerleri 0
SELECT 'analytics_daily' AS tablo, count(*) AS satir FROM analytics_daily
UNION ALL SELECT 'analytics_events', count(*) FROM analytics_events
UNION ALL SELECT 'analytics_product_daily', count(*) FROM analytics_product_daily
UNION ALL SELECT 'blog_posts', count(*) FROM blog_posts
UNION ALL SELECT 'campaigns', count(*) FROM campaigns
UNION ALL SELECT 'carrier_regions', count(*) FROM carrier_regions
UNION ALL SELECT 'collections', count(*) FROM collections
UNION ALL SELECT 'consent_logs', count(*) FROM consent_logs
UNION ALL SELECT 'homepage_settings', count(*) FROM homepage_settings
UNION ALL SELECT 'newsletter_subscribers', count(*) FROM newsletter_subscribers
UNION ALL SELECT 'order_requests', count(*) FROM order_requests
UNION ALL SELECT 'orders', count(*) FROM orders
UNION ALL SELECT 'products', count(*) FROM products
UNION ALL SELECT 'reviews', count(*) FROM reviews
UNION ALL SELECT 'shipment_events', count(*) FROM shipment_events
UNION ALL SELECT 'shipments', count(*) FROM shipments
UNION ALL SELECT 'site_content', count(*) FROM site_content
UNION ALL SELECT 'sync_log', count(*) FROM sync_log
UNION ALL SELECT 'user_addresses', count(*) FROM user_addresses
UNION ALL SELECT 'user_billing', count(*) FROM user_billing
UNION ALL SELECT 'user_profiles', count(*) FROM user_profiles
UNION ALL SELECT 'wishlists', count(*) FROM wishlists
ORDER BY 1;

-- 2) KRİTİK ALANLAR --------------------------------------------------------
-- beklenen: aktif ürün 438 · vitrin görünümü 438 · override_title dolu 287*
--           (*287 rakamı /urunler sayacıdır; tekilleştirme sonrası kart sayısı)
SELECT 'aktif ürün' AS kontrol, count(*) AS deger FROM products WHERE is_active = true
UNION ALL SELECT 'products_display satır', count(*) FROM products_display
UNION ALL SELECT 'override_title dolu', count(*) FROM products WHERE override_title IS NOT NULL
UNION ALL SELECT 'override_images dolu', count(*) FROM products WHERE override_images IS NOT NULL AND override_images <> '[]'::jsonb
UNION ALL SELECT 'trendyol_barcode dolu', count(*) FROM products WHERE trendyol_barcode IS NOT NULL
UNION ALL SELECT 'stok=1 aktif ürün', count(*) FROM products WHERE trendyol_stock = 1 AND is_active = true
UNION ALL SELECT 'yayımlı blog yazısı', count(*) FROM blog_posts WHERE published = true
UNION ALL SELECT 'kapaklı blog yazısı', count(*) FROM blog_posts WHERE cover_image IS NOT NULL
UNION ALL SELECT 'aktif koleksiyon', count(*) FROM collections WHERE is_active = true
UNION ALL SELECT 'koleksiyon üyesi (toplam)', COALESCE(sum(array_length(product_ids, 1)), 0) FROM collections
UNION ALL SELECT 'aktif kampanya', count(*) FROM campaigns WHERE is_active = true
UNION ALL SELECT 'kürasyon bölümü', count(*) FROM homepage_settings
UNION ALL SELECT 'hero slaytı', COALESCE(jsonb_array_length(payload -> 'slides'), 0) FROM homepage_settings WHERE section = 'hero_slides'
UNION ALL SELECT 'site_content anahtarı', count(*) FROM site_content
UNION ALL SELECT 'künye anahtarı (dolu)', count(*) FROM site_content WHERE key LIKE 'veri_sorumlusu_%' AND value <> ''
UNION ALL SELECT 'kargonomi il', count(*) FROM carrier_regions WHERE provider = 'kargonomi' AND kind = 'state'
UNION ALL SELECT 'kargonomi ilçe', count(*) FROM carrier_regions WHERE provider = 'kargonomi' AND kind = 'city'
ORDER BY 1;

-- 3) YABANCI ANAHTAR BÜTÜNLÜĞÜ (hepsi 0 dönmeli) ---------------------------
SELECT 'öksüz order_requests' AS kontrol, count(*) AS deger
  FROM order_requests r LEFT JOIN orders o ON o.id = r.order_id WHERE r.order_id IS NOT NULL AND o.id IS NULL
UNION ALL SELECT 'öksüz shipments', count(*)
  FROM shipments s LEFT JOIN orders o ON o.id = s.order_id WHERE o.id IS NULL
UNION ALL SELECT 'öksüz shipment_events', count(*)
  FROM shipment_events e LEFT JOIN shipments s ON s.id = e.shipment_id WHERE s.id IS NULL
UNION ALL SELECT 'öksüz wishlists', count(*)
  FROM wishlists w LEFT JOIN products p ON p.id = w.product_id WHERE w.product_id IS NOT NULL AND p.id IS NULL
UNION ALL SELECT 'öksüz reviews', count(*)
  FROM reviews rv LEFT JOIN products p ON p.id = rv.product_id WHERE p.id IS NULL
UNION ALL SELECT 'kampanyasız sipariş bağı', count(*)
  FROM orders o LEFT JOIN campaigns c ON c.id = o.applied_campaign_id
  WHERE o.applied_campaign_id IS NOT NULL AND c.id IS NULL
ORDER BY 1;

-- 4) ESKİ PROJE KİMLİĞİ KALINTISI (0 dönmeli) ------------------------------
-- Taşıma sonrası hiçbir kayıt eski projenin alan adını göstermemeli.
SELECT 'homepage_settings' AS tablo, count(*) AS eski_url_iceren
  FROM homepage_settings WHERE payload::text LIKE '%npvanotrzbqsnxvasmxm%'
UNION ALL SELECT 'products', count(*) FROM products
  WHERE COALESCE(override_images::text, '') LIKE '%npvanotrzbqsnxvasmxm%'
UNION ALL SELECT 'blog_posts', count(*) FROM blog_posts
  WHERE COALESCE(cover_image, '') LIKE '%npvanotrzbqsnxvasmxm%'
UNION ALL SELECT 'collections', count(*) FROM collections
  WHERE COALESCE(image_url, '') LIKE '%npvanotrzbqsnxvasmxm%'
UNION ALL SELECT 'site_content', count(*) FROM site_content
  WHERE value LIKE '%npvanotrzbqsnxvasmxm%'
ORDER BY 1;

-- 5) RLS DURUMU (hepsi true olmalı) ----------------------------------------
SELECT c.relname AS tablo, c.relrowsecurity AS rls_acik,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS politika
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
