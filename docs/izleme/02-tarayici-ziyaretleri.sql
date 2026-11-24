-- =====================================================================
-- NB Steelora — yapay zekâ ve arama tarayıcıları sayacı (24 Kas 2026)
-- Supabase → SQL Editor'de BİR KEZ çalıştırın. Yeniden çalıştırmak zararsızdır.
-- =====================================================================
--
-- NEDEN: "ChatGPT, Perplexity, Claude gibi asistanlar sitemizi okuyor mu,
-- hangi sayfaları ne sıklıkla okuyor?" sorusunun cevabı hiçbir yerde yoktu.
-- Vitrin sayfaları önbellekten verildiği için sunucu kodu bu istekleri
-- görmüyor; ziyaretçi ölçümü de robotları bilerek dışarıda bırakıyor.
--
-- NASIL: istek katmanı (src/proxy.ts) YALNIZ kullanıcı aracısı listedeki bir
-- tarayıcı adını taşıyan isteklerde çalışır ve aşağıdaki fonksiyonu çağırır.
-- İnsan ziyaretçilerin isteği bu koda hiç uğramaz.
--
-- KİŞİSEL VERİ YOK: IP ve kullanıcı aracısı yazılmaz. Satır: gün, tarayıcı adı
-- (listeden), grup, sorgusuz adres ve o günkü sayı.
--
-- TABLO BÜYÜMEZ: aynı gün + tarayıcı + adres tek satırdır (sayı artar). Bir
-- tarayıcı günde en çok 400 farklı adres yazar; fazlası "(diğer)" satırında
-- toplanır. 180 günden eski satırlar kendiliğinden silinir.
--
-- Bu dosya çalıştırılana kadar uygulama AÇIK BAŞARISIZ olur: sayaç yazamaz,
-- site aynen çalışır; paneldeki kart "kayıt tablosu henüz açılmadı" der.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.tarayici_ziyaretleri (
  gun          date        NOT NULL,
  tarayici     text        NOT NULL,
  yol          text        NOT NULL,
  grup         text        NOT NULL,
  adet         integer     NOT NULL DEFAULT 0,
  son_gorulme  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gun, tarayici, yol)
);

ALTER TABLE public.tarayici_ziyaretleri ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tarayici_ziyaretleri FROM anon, authenticated;

-- Tek çağrıda say. Yalnız sunucu (service_role) çağırabilir.
CREATE OR REPLACE FUNCTION public.tarayici_ziyareti_yaz(
  p_tarayici text,
  p_grup     text,
  p_yol      text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gun date := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_yol text := left(coalesce(nullif(p_yol, ''), '/'), 160);
BEGIN
  IF p_tarayici IS NULL OR length(p_tarayici) = 0 OR length(p_tarayici) > 60 THEN
    RETURN;
  END IF;
  IF p_grup IS NULL OR p_grup NOT IN ('asistan', 'egitim', 'arama') THEN
    RETURN;
  END IF;

  UPDATE public.tarayici_ziyaretleri
     SET adet = adet + 1, son_gorulme = now()
   WHERE gun = v_gun AND tarayici = p_tarayici AND yol = v_yol;
  IF FOUND THEN
    RETURN;
  END IF;

  -- Günlük tavan: tek tarayıcı günde en çok 400 farklı adres yazar.
  IF (SELECT count(*) FROM public.tarayici_ziyaretleri
       WHERE gun = v_gun AND tarayici = p_tarayici) >= 400 THEN
    v_yol := '(diğer)';
  END IF;

  INSERT INTO public.tarayici_ziyaretleri (gun, tarayici, yol, grup, adet, son_gorulme)
       VALUES (v_gun, p_tarayici, v_yol, p_grup, 1, now())
  ON CONFLICT (gun, tarayici, yol)
  DO UPDATE SET adet = public.tarayici_ziyaretleri.adet + 1, son_gorulme = now();

  -- Fırsat temizliği: yeni satır açılırken, yaklaşık 100'de bir.
  IF random() < 0.01 THEN
    DELETE FROM public.tarayici_ziyaretleri WHERE gun < v_gun - 180;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.tarayici_ziyareti_yaz(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tarayici_ziyareti_yaz(text, text, text) TO service_role;

-- API'nin yeni tablo ve fonksiyonu hemen görmesi için şema önbelleğini tazele.
NOTIFY pgrst, 'reload schema';

-- Doğrulama (isteğe bağlı):
-- SELECT public.tarayici_ziyareti_yaz('deneme', 'asistan', '/');
-- SELECT * FROM public.tarayici_ziyaretleri WHERE tarayici = 'deneme';   -- adet = 1
-- DELETE FROM public.tarayici_ziyaretleri WHERE tarayici = 'deneme';
