-- Faz 28 · T.C. kimlik numarası sütunlarının kaldırılması
--
-- GEREKÇE (mevzuat): Vergi mükellefi olmayan NİHAİ TÜKETİCİYE kesilen
-- faturada T.C. kimlik/vergi numarası bulunma zorunluluğu YOKTUR.
-- Tek istisna: aynı müşteriye aynı gün KDV hariç 5.000 TL üzeri satış →
-- Form Bs bildirimi. NB Steelora fiyat bandı 279-649 TL; eşik nadiren aşılır
-- ve aşıldığında panel uyarı gösteriyor (lib/orders/bsBildirimi.ts).
--
-- Numara toplanıyordu ama kodda HİÇ OKUNMUYORDU ve KVKK aydınlatma metninde
-- de sayılmıyordu — yani hem amaç sınırlaması (m.4/1-c) hem aydınlatma
-- (m.10) açısından tutulamaz bir veriydi. iyzico'ya da hiçbir zaman
-- gönderilmiyordu (sabit dolgu değeri kullanılıyor).
--
-- ÖLÇÜM (24.08.2026, kaldırmadan önce):
--   user_billing   : 0 satır, TC dolu 0
--   user_profiles  : 1 satır, TC dolu 0
-- Yani silinecek gerçek veri yok; sütunlar yine de kaldırılıyor ki ileride
-- yanlışlıkla doldurulmasınlar.
--
-- Supabase → SQL Editor'de çalıştırın:

-- 1) Önce veriyi boşalt (sütun düşürmeden önce, denetim izi için ayrı adım).
UPDATE public.user_billing  SET tc_no      = NULL WHERE tc_no      IS NOT NULL;
UPDATE public.user_profiles SET tc_kimlik  = NULL WHERE tc_kimlik  IS NOT NULL;

-- 2) Sütunları kaldır.
ALTER TABLE public.user_billing  DROP COLUMN IF EXISTS tc_no;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS tc_kimlik;

-- Doğrulama — iki sorgu da 0 satır dönmeli:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='user_billing'  AND column_name='tc_no';
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='user_profiles' AND column_name='tc_kimlik';
