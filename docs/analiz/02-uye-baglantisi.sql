-- Faz 23-B · Üye bazlı analiz için analytics_events.user_id
--
-- KVKK KAPISI: Bu sütun kişiyi DOĞRUDAN tanımlanabilir kılar. Kod tarafında
-- şu dördü hazır olmadan yazılmaz (hepsi bu fazda yapıldı):
--   a) KVKK aydınlatma + çerez politikasında üye hareketi işleme satırı
--   b) 13 ay saklama + otomatik silme (haftalık cron · /api/analytics/temizle)
--   c) Hesap silinince kayıtların da silinmesi  → aşağıdaki ON DELETE CASCADE
--   d) Panelde üye detayında "bu veriyi sil" düğmesi
--
-- ON DELETE CASCADE bilinçli: (c) maddesini uygulama koduna bırakmak, silme
-- akışının bir kolu unutulduğunda sessizce veri bırakırdı. Veritabanı garanti
-- eder.
--
-- Supabase → SQL Editor'de çalıştırın:

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS user_id uuid
  REFERENCES auth.users(id) ON DELETE CASCADE;

-- Üye detayındaki hareket listesi ve "üye/misafir" kırılımı bu indeksi kullanır.
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx
  ON public.analytics_events (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

-- 13 aylık saklama süresi süpürmesi de tarih üzerinden çalışır.
CREATE INDEX IF NOT EXISTS analytics_events_occurred_at_idx
  ON public.analytics_events (occurred_at);

-- Doğrulama:
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_name = 'analytics_events' AND column_name = 'user_id';
