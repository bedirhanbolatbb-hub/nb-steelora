-- Faz 27 · Kalıcı hız sınırı sayacı
--
-- NEDEN: Koddaki tek hız sınırı /api/reviews içinde bellek içi bir Map'ti ve
-- Vercel'de işe yaramıyordu — her istek başka bir sunucusuz örnekte
-- çalışabildiği için sayaç sıfırdan başlıyordu. Giriş denemesi, kupon deneme,
-- ödeme başlatma, yorum, bülten ve iletişim uçlarının hiçbirinde sınır yoktu.
--
-- Sayaçta KİŞİSEL VERİ YOK: anahtar, günlük tuzla özetlenmiş IP'dir; ham adres
-- hiçbir zaman yazılmaz. Süresi geçen satırlar temizlenir.
--
-- Bu DDL çalıştırılana kadar uygulama AÇIK BAŞARISIZ olur: sınır uygulanmaz
-- ama site çalışmaya devam eder ve sunucu günlüğüne bir uyarı düşer.
--
-- Supabase → SQL Editor'de çalıştırın:

CREATE TABLE IF NOT EXISTS public.hiz_sayaci (
  anahtar     text PRIMARY KEY,
  sayi        integer NOT NULL DEFAULT 0,
  gecerlilik  timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS hiz_sayaci_gecerlilik_idx
  ON public.hiz_sayaci (gecerlilik);

ALTER TABLE public.hiz_sayaci ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hiz_sayaci FROM anon, authenticated;

-- Tek atomik adımda arttır ve yeni değeri döndür. Yarış durumu yok:
-- ON CONFLICT ... DO UPDATE aynı satırda kilitlenir.
CREATE OR REPLACE FUNCTION public.hiz_sayaci_arttir(
  p_anahtar text,
  p_gecerlilik timestamptz
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sayi integer;
BEGIN
  INSERT INTO public.hiz_sayaci (anahtar, sayi, gecerlilik)
       VALUES (p_anahtar, 1, p_gecerlilik)
  ON CONFLICT (anahtar)
  DO UPDATE SET sayi = public.hiz_sayaci.sayi + 1
    RETURNING sayi INTO v_sayi;

  -- Fırsat temizliği: her 100 çağrıda bir süresi geçmiş satırları at.
  -- Ayrı bir cron'a bağlamamak için; tablo zaten küçük kalır.
  IF (v_sayi % 100) = 0 THEN
    DELETE FROM public.hiz_sayaci WHERE gecerlilik < now() - interval '1 hour';
  END IF;

  RETURN v_sayi;
END;
$$;

REVOKE ALL ON FUNCTION public.hiz_sayaci_arttir(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hiz_sayaci_arttir(text, timestamptz) TO service_role;

-- Doğrulama (service role ile):
-- SELECT public.hiz_sayaci_arttir('deneme', now() + interval '1 minute');  -- 1
-- SELECT public.hiz_sayaci_arttir('deneme', now() + interval '1 minute');  -- 2
-- DELETE FROM public.hiz_sayaci WHERE anahtar = 'deneme';
