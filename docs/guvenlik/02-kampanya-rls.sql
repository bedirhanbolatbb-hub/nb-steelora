-- Faz 27 · Kampanya tablosunun anon rolüne kapatılması
--
-- ÖLÇÜM (23.08.2026, anon anahtarıyla canlıda): anon rolü `campaigns`
-- tablosundan 3 satır okuyabiliyor ve satırlar `code`, `discount_value`,
-- `starts_at` alanlarını taşıyor. Anon anahtarı istemci paketine gömülü,
-- yani HERKESE AÇIK. Sonuç: yayınlanmamış kupon kodları ve indirim oranları
-- dışarıdan listelenebiliyor.
--
--   Hoş Geldin İndirimi     kod=HOSGELDIN10  %10   (31 Ağustos'a kadar uykuda)
--   İkinci Sipariş Kuponu   kod=—            %10
--   TÜM ÜRÜNLERDE %30       kod=NB30         %30   (zaten reklam ediliyor)
--
-- Veri sızıntısı değil, ticari bilgi sızıntısı: kampanya takvimi ve
-- indirim stratejisi rakibe açık, kupon da duyurulmadan kullanılabilir.
--
-- Vitrin kampanyaları SUNUCUDAN okuyor (service role, src/lib/campaigns/
-- yukle.ts), yani anon erişimi hiçbir yerde GEREKMİYOR.
--
-- Supabase → SQL Editor'de çalıştırın:

-- Mevcut anon politikalarını görün (çalıştırmadan önce not alın):
--   SELECT policyname, roles, cmd, qual
--     FROM pg_policies WHERE tablename = 'campaigns';

REVOKE ALL ON public.campaigns FROM anon;
REVOKE ALL ON public.campaign_targets FROM anon;
REVOKE ALL ON public.campaign_tiers FROM anon;

-- RLS'in açık olduğundan emin olun (GRANT geri alınsa da politika kalmasın):
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Anon'a okuma veren politikaları düşürün. Ad farklıysa yukarıdaki sorgudan
-- gerçek adı alıp kullanın.
DROP POLICY IF EXISTS "Public read active campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "campaigns_select_anon" ON public.campaigns;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.campaigns;

-- Doğrulama — anon anahtarıyla şu istek BOŞ DİZİ ya da 401 dönmeli:
--   curl "$URL/rest/v1/campaigns?select=code" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
