-- =====================================================================
-- NB Steelora — kritik uyarı kısıtlama tablosu (Faz 19)
-- Supabase SQL Editor'de çalıştırın.
-- =====================================================================
--
-- NEDEN: Ödeme başlatma hatası, sync başarısızlığı, webhook imza hatası ve
-- stok yazımı hatası artık BB'ye anında mail atıyor. Kalıcı bir arıza
-- (ör. iyzico kesintisi) dakikada onlarca mail üretebilirdi; bu tablo
-- "aynı uyarı için saatte bir kez" kuralının hafızası.
--
-- Repodaki tek throttle deseni (src/app/api/reviews/route.ts) BELLEK İÇİ bir
-- Map: Vercel'de her lambda örneği kendi kopyasını tutar ve soğuk başlangıçta
-- sıfırlanır — uyarı kısıtlaması için kullanılamaz. Kalıcı durum şart.
--
-- NOT: tablo yoksa kod çökmüyor; bellek içi yedeğe düşüp uyarıyı yine
-- gönderiyor (haber alamamaktansa fazladan mail iyidir).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.alert_state (
  -- Uyarı tipi: 'odeme_baslatma', 'sync_basarisiz', 'webhook_imza',
  -- 'stok_yazimi'. PK olması UPSERT'i tek çağrıda yapılabilir kılıyor.
  key            text PRIMARY KEY,
  -- Pencere bunun üstünden hesaplanır.
  last_sent_at   timestamptz NOT NULL DEFAULT now(),
  -- Uyarı içeriğinin özeti. Aynı tipte AMA farklı bir hata geldiğinde
  -- pencere beklenmeden gönderilir (ör. "failed" → "running takıldı").
  fingerprint    text,
  -- Pencerede bastırılan tekrar sayısı → mailde "son 1 saatte 7 kez".
  count          integer NOT NULL DEFAULT 1,
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  -- Son hata detayı: mail atmadan panelden de bakılabilsin.
  payload        jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Analytics tablolarındaki desen: istemciye kapalı, yalnız service_role.
ALTER TABLE public.alert_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.alert_state FROM anon, authenticated;

-- =====================================================================
-- DOĞRULAMA
-- =====================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'alert_state'
ORDER BY ordinal_position;

SELECT relrowsecurity AS rls_acik
FROM pg_class WHERE relname = 'alert_state';
