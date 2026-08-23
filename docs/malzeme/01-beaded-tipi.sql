-- =====================================================================
-- NB Steelora — material_type'a 'beaded' tipi ekleniyor
-- Supabase SQL Editor'de çalıştırın (bu depo migration koşturmaz).
-- =====================================================================
--
-- NEDEN:
-- Trendyol "Materyal" özniteliği (attributeId 14) dört kanonik değer
-- gönderiyor: Paslanmaz Çelik · Pirinç · Çelik · Boncuk. İlk üçünün
-- karşılığı var, "Boncuk"un yoktu. 9 yazlık halhal bu yüzden 'unknown'
-- kalıyor ve sitede de Google beslemesinde de malzeme satırı hiç
-- basılmıyordu. Boncuklu bir halhalı mevcut iki tipten birine ("Premium
-- Kaplama Pirinç") sokmak yanlış beyan olurdu; doğru çözüm tipi eklemek.
--
-- NE YAPAR:
-- products.material_type üzerindeki CHECK kısıtını 'beaded' değerini de
-- kabul edecek şekilde değiştirir. Veri SİLMEZ, satır GÜNCELLEMEZ,
-- kolon eklemez/kaldırmaz. Değerleri senkron dolduracak.
--
-- SONRASI: panelden "Senkronize et" (ya da ertesi günkü 09:00 cron)
-- 9 halhalı 'beaded' yapar. Elle girilmiş dolu değerler ezilmez.
-- =====================================================================

BEGIN;

-- 1) Mevcut CHECK kısıtını adı ne olursa olsun bul ve kaldır.
--    (Şema dosyasında adı products_material_type_check ama canlıda
--     farklı adlandırılmış olabilir; ada güvenmiyoruz.)
DO $$
DECLARE
  kisit_adi text;
BEGIN
  FOR kisit_adi IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'products'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%material_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT %I', kisit_adi);
    RAISE NOTICE 'Kaldırılan kısıt: %', kisit_adi;
  END LOOP;
END $$;

-- 2) Yeni kısıt — 'beaded' eklendi.
--    NULL bilerek serbest: panel malzemeyi boşaltınca NULL yazıyor.
ALTER TABLE public.products
  ADD CONSTRAINT products_material_type_check
  CHECK (
    material_type IS NULL
    OR material_type = ANY (ARRAY['stainless_steel', 'plated_brass', 'beaded', 'unknown'])
  );

COMMIT;

-- =====================================================================
-- DOĞRULAMA — aşağıdakileri çalıştırıp çıktıyı bana iletin.
-- =====================================================================

-- (a) Kısıt tanımı 'beaded' içermeli:
SELECT con.conname, pg_get_constraintdef(con.oid) AS tanim
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public' AND rel.relname = 'products' AND con.contype = 'c'
  AND pg_get_constraintdef(con.oid) ILIKE '%material_type%';

-- (b) Mevcut dağılım bozulmamış olmalı (aktif: 265 / 158 / 9):
SELECT material_type, count(*) AS adet
FROM public.products
WHERE is_active = true
GROUP BY material_type
ORDER BY adet DESC;

-- (c) Tripwire — 520 / 432 değişmemeli:
SELECT count(*) AS toplam, count(*) FILTER (WHERE is_active) AS aktif
FROM public.products;
