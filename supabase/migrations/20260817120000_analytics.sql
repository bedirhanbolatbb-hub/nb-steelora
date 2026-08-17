-- Faz 12: kendi first-party analitiğimiz + KVKK rıza yönetimi (additive).
--
-- İki katman:
--   KATMAN A (rıza gerekmez): visitor_id NULL. Anonim, oturum bazlı, kişi
--     profili yok, IP saklanmaz, user-agent'tan yalnız cihaz tipi türetilir.
--   KATMAN B (yalnız açık rıza): visitor_id dolu — birinci taraf çerezle
--     tekrar gelen ziyaretçi ve oturumlar arası yolculuk.
-- Rıza geri alınınca Katman B satırları anonimleştirilir (visitor_id NULL'a
-- çekilir), Katman A ölçümü bozulmadan kalır.

-- 1) Ham olaylar --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigserial PRIMARY KEY,
  event text NOT NULL,
  -- Oturum kimliği: kalıcı değil, çerezsiz (sunucuda türetilir/istemcide
  -- sessionStorage). Kişiye bağlanamaz.
  session_id text NOT NULL,
  -- Katman B işareti. NULL = anonim ölçüm.
  visitor_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  path text,
  referrer_host text,
  device text,
  product_id uuid,
  collection_slug text,
  search_query text,
  value numeric(12,2),
  order_id uuid,
  meta jsonb,
  CONSTRAINT analytics_events_event_check CHECK (event IN (
    'page_view','product_view','add_to_cart','remove_from_cart',
    'favorite_add','favorite_remove','search','begin_checkout',
    'purchase','signup','newsletter_signup'
  )),
  CONSTRAINT analytics_events_device_check CHECK (device IS NULL OR device IN ('mobile','tablet','desktop','bot'))
);

CREATE INDEX IF NOT EXISTS analytics_events_occurred_idx ON public.analytics_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_occurred_idx ON public.analytics_events (event, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_product_idx ON public.analytics_events (product_id, occurred_at DESC) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx ON public.analytics_events (visitor_id) WHERE visitor_id IS NOT NULL;
-- purchase olayı sipariş başına tek satır (çift sayım kalkanı).
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_purchase_once
  ON public.analytics_events (order_id) WHERE event = 'purchase' AND order_id IS NOT NULL;

-- 2) Rıza kayıtları (KVKK kanıtı) ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  -- {"zorunlu":true,"analitik_gelismis":false,"pazarlama":false}
  categories jsonb NOT NULL,
  version text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  -- banner | ayarlar | geri_alma
  source text NOT NULL DEFAULT 'banner'
);

CREATE INDEX IF NOT EXISTS consent_logs_visitor_idx ON public.consent_logs (visitor_id);
CREATE INDEX IF NOT EXISTS consent_logs_occurred_idx ON public.consent_logs (occurred_at DESC);

-- 3) Özet tablolar (gecelik cron; panel önce özetten okur) ---------------------
CREATE TABLE IF NOT EXISTS public.analytics_daily (
  day date PRIMARY KEY,
  sessions integer NOT NULL DEFAULT 0,
  visitors integer NOT NULL DEFAULT 0,
  page_views integer NOT NULL DEFAULT 0,
  product_views integer NOT NULL DEFAULT 0,
  add_to_cart integer NOT NULL DEFAULT 0,
  begin_checkout integer NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  revenue numeric(12,2) NOT NULL DEFAULT 0,
  signups integer NOT NULL DEFAULT 0,
  favorites integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analytics_product_daily (
  day date NOT NULL,
  product_id uuid NOT NULL,
  views integer NOT NULL DEFAULT 0,
  add_to_cart integer NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  revenue numeric(12,2) NOT NULL DEFAULT 0,
  favorites integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, product_id)
);

-- 4) RLS ----------------------------------------------------------------------
-- Dört tablo da yalnız service role tarafından yazılır/okunur: olay yazımı
-- sunucu ucundan geçer (anon doğrudan yazamaz), panel okuması guard arkasında.
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_product_daily ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.analytics_events FROM anon, authenticated;
REVOKE ALL ON public.consent_logs FROM anon, authenticated;
REVOKE ALL ON public.analytics_daily FROM anon, authenticated;
REVOKE ALL ON public.analytics_product_daily FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.analytics_events_id_seq FROM anon, authenticated;
