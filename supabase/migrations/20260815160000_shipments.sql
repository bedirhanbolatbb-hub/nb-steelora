-- Faz 10A: sağlayıcıdan bağımsız kargo altyapısı (additive).
-- orders tablosuna DOKUNULMAZ; mevcut orders.tracking_number alanı korunur ve
-- gönderi oluşunca uygulama katmanı tarafından senkron tutulur.

-- 1) Gönderiler ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_shipment_id text NOT NULL,
  tracking_code text,
  carrier_name text,
  carrier_slug text,
  -- İç durum kümesi (sağlayıcıdan bağımsız).
  status text NOT NULL DEFAULT 'hazirlaniyor',
  -- Sağlayıcının ham kodu — eşlenmeyen kodlar burada görünür kalır.
  status_raw text,
  price_estimated numeric(10,2),
  price_real numeric(10,2),
  desi numeric(6,2),
  package_count integer NOT NULL DEFAULT 1,
  label_pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CONSTRAINT shipments_status_check CHECK (status IN (
    'hazirlaniyor','kargoya_verildi','yolda','dagitimda','teslim_edildi',
    'teslim_edilemedi','iade_surecinde','kayip','iptal'
  ))
);

-- Aynı sağlayıcıda aynı gönderi iki kez kaydedilemez (webhook idempotansının
-- ilk katmanı; ikinci katman shipment_events'teki idempotency_key).
CREATE UNIQUE INDEX IF NOT EXISTS shipments_provider_shipment_key
  ON public.shipments (provider, provider_shipment_id);
CREATE INDEX IF NOT EXISTS shipments_order_id_idx ON public.shipments (order_id);
CREATE INDEX IF NOT EXISTS shipments_tracking_code_idx ON public.shipments (tracking_code);

-- 2) Gönderi olayları (müşteri zaman çizelgesinin kaynağı) --------------------
CREATE TABLE IF NOT EXISTS public.shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status text NOT NULL,
  status_raw text,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  -- Sağlayıcı tekrar gönderirse aynı olay iki kez işlenmesin.
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipment_events_source_check CHECK (source IN ('webhook','manual','poll'))
);

CREATE UNIQUE INDEX IF NOT EXISTS shipment_events_idempotency_key
  ON public.shipment_events (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS shipment_events_shipment_id_idx
  ON public.shipment_events (shipment_id, occurred_at DESC);

-- 3) Sağlayıcı il/ilçe kimlikleri (önbellek) ----------------------------------
-- Sipariş adresindeki il/ilçe metni bu tabloyla eşleştirilir; eşleşmezse panel
-- manuel seçim ister (sessiz hata yok).
CREATE TABLE IF NOT EXISTS public.carrier_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  -- 'state' = il, 'city' = ilçe
  kind text NOT NULL,
  provider_id integer NOT NULL,
  name text NOT NULL,
  -- Aksansız/küçük harfli eşleme anahtarı.
  name_key text NOT NULL,
  parent_provider_id integer,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carrier_regions_kind_check CHECK (kind IN ('state','city'))
);

CREATE UNIQUE INDEX IF NOT EXISTS carrier_regions_unique
  ON public.carrier_regions (provider, kind, provider_id);
CREATE INDEX IF NOT EXISTS carrier_regions_lookup_idx
  ON public.carrier_regions (provider, kind, name_key);

-- 4) RLS ----------------------------------------------------------------------
-- Üç tablo da yalnız service role (panel/API) tarafından yazılır ve okunur.
-- Müşteri verisine yalnız /api/kargo-takip sorgulama ucu üzerinden, sipariş
-- no + e-posta (ya da takip kodu) doğrulamasıyla erişilir — doğrudan istemci
-- okuması yoktur. Politika eklenmediği için RLS açıkken anon/authenticated
-- rollerine hiçbir satır görünmez; service role RLS'i baypas eder.
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_regions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shipments FROM anon, authenticated;
REVOKE ALL ON public.shipment_events FROM anon, authenticated;
REVOKE ALL ON public.carrier_regions FROM anon, authenticated;
