-- =============================================================
-- NB Steelora — YENİ PROJEDE TEK SEFERDE ÇALIŞTIRIN
-- Supabase → SQL Editor → New query → bu dosyanın TAMAMINI yapıştır → Run
-- (01-schema.sql + 02-policies.sql birleşimi)
-- Hedef: halyhtowppivuwpdserp (eu-central-1 / Frankfurt)
-- =============================================================

-- =====================================================================

CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  product_ids uuid[] DEFAULT '{}'::uuid[]
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  trendyol_id text NOT NULL UNIQUE,
  trendyol_title text NOT NULL,
  trendyol_description text,
  trendyol_price numeric NOT NULL,
  trendyol_stock integer DEFAULT 0,
  trendyol_images jsonb DEFAULT '[]'::jsonb,
  trendyol_category text,
  trendyol_barcode text,
  override_title text,
  override_description text,
  override_price numeric,
  override_images jsonb,
  collection_id uuid REFERENCES public.collections(id),
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  badge text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz DEFAULT now(),
  avg_rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  barcode text,
  note text,
  sales_count integer DEFAULT 0,
  material_type text DEFAULT 'unknown'::text,
  gender text DEFAULT 'women'::text,
  variant_label text,
  CONSTRAINT products_badge_check CHECK (badge = ANY (ARRAY['new','bestseller','sale'])),
  CONSTRAINT products_gender_check CHECK (gender = ANY (ARRAY['women','men','unisex'])),
  CONSTRAINT products_material_type_check CHECK (material_type = ANY (ARRAY['stainless_steel','plated_brass','unknown']))
);

-- Trendyol senkronu tek upsert ile çalışır; bu benzersizlik zorunlu.
CREATE UNIQUE INDEX IF NOT EXISTS products_trendyol_barcode_key
  ON public.products (trendyol_barcode);

-- Vitrinin okuduğu görünüm (yalnız aktif ürünler + display_* alanları)
CREATE OR REPLACE VIEW public.products_display AS
SELECT id, slug, trendyol_id, trendyol_title, trendyol_description, trendyol_price,
       trendyol_stock, trendyol_images, trendyol_category, trendyol_barcode,
       override_title, override_description, override_price, override_images,
       collection_id, is_active, is_featured, badge, created_at, updated_at,
       last_synced_at, avg_rating, review_count, barcode, note, sales_count,
       material_type, gender,
       COALESCE(override_title, trendyol_title) AS display_title,
       COALESCE(override_price, trendyol_price) AS display_price,
       COALESCE(NULLIF(override_images, '[]'::jsonb), NULLIF(trendyol_images, '[]'::jsonb)) AS display_images,
       variant_label
FROM public.products p
WHERE is_active = true;

-- =====================================================================
-- 2) SİPARİŞ / MÜŞTERİ
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL,
  code text UNIQUE,
  discount_type text,
  discount_value numeric,
  min_cart_amount numeric DEFAULT 0,
  max_uses integer,
  used_count integer DEFAULT 0,
  banner_text text,
  banner_color text DEFAULT '#2A1E1E'::text,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT campaigns_type_check CHECK (type = ANY (ARRAY['discount_code','cart_discount','free_shipping','banner','buy_x_get_y'])),
  CONSTRAINT campaigns_discount_type_check CHECK (discount_type = ANY (ARRAY['percent','fixed']))
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id),
  guest_email text,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  shipping_cost numeric DEFAULT 0,
  total numeric NOT NULL,
  status text DEFAULT 'pending'::text,
  iyzico_payment_id text,
  shipping_address jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tracking_number text,
  discount_amount numeric DEFAULT 0,
  applied_campaign_id uuid REFERENCES public.campaigns(id),
  gift_note text,
  stock_deducted_at timestamptz,
  stock_restored_at timestamptz,
  payment_refunded_at timestamptz,
  stock_deduction_failed boolean DEFAULT false,
  stock_deduction_error text,
  cart_reminder_sent_at timestamptz,
  review_invite_sent_at timestamptz,
  CONSTRAINT orders_status_check CHECK (status = ANY (ARRAY['pending','paid','preparing','shipped','delivered','cancelled']))
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stock_deduction_failed
  ON public.orders (stock_deduction_failed) WHERE stock_deduction_failed = true;

CREATE TABLE IF NOT EXISTS public.order_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  message text,
  return_reason text,
  cargo_company text,
  cargo_tracking_code text,
  return_instructions text,
  cargo_info_sent_at timestamptz,
  CONSTRAINT order_requests_type_check CHECK (request_type = ANY (ARRAY['cancel','return'])),
  CONSTRAINT order_requests_status_check CHECK (status = ANY (ARRAY['pending','cargo_pending','cargo_sent','inspecting','approved','rejected']))
);

CREATE INDEX IF NOT EXISTS idx_order_requests_order_id ON public.order_requests (order_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_user_id ON public.order_requests (user_id);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  default_address jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  birth_date date,
  gender text,
  newsletter_opt_in boolean DEFAULT false,
  tc_kimlik text,
  CONSTRAINT user_profiles_gender_check CHECK (gender = ANY (ARRAY['female','male','other','prefer_not_to_say']))
);

CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  address text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_type text DEFAULT 'individual'::text,
  full_name text,
  tc_no text,
  company_name text,
  tax_office text,
  tax_no text,
  city text,
  district text,
  address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id text,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id),
  UNIQUE (guest_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name text,
  guest_email text,
  rating integer NOT NULL,
  title text,
  body text NOT NULL,
  is_approved boolean DEFAULT false,
  is_verified_purchase boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5)
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  subscribed_at timestamptz DEFAULT now(),
  source text DEFAULT 'homepage'::text,
  is_active boolean DEFAULT true,
  consented_at timestamptz
);

-- =====================================================================
-- 3) İÇERİK / VİTRİN AYARLARI
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.site_content (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.homepage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  product_ids uuid[] DEFAULT '{}'::uuid[],
  updated_at timestamptz DEFAULT now(),
  payload jsonb
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  cover_image text,
  published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  meta_title text,
  meta_description text,
  read_time integer DEFAULT 5
);

CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON public.blog_posts (published, published_at DESC);

-- =====================================================================
-- 4) SENKRON
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at timestamptz DEFAULT now(),
  products_updated integer DEFAULT 0,
  products_added integer DEFAULT 0,
  status text DEFAULT 'success'::text,
  error_message text,
  run_id text,
  pages_done integer NOT NULL DEFAULT 0,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sync_log_status_synced_at
  ON public.sync_log (status, synced_at DESC);

-- =====================================================================
-- 5) KARGO (Faz 10A)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_shipment_id text NOT NULL,
  tracking_code text,
  carrier_name text,
  carrier_slug text,
  status text NOT NULL DEFAULT 'hazirlaniyor',
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
    'teslim_edilemedi','iade_surecinde','kayip','iptal'))
);

CREATE UNIQUE INDEX IF NOT EXISTS shipments_provider_shipment_key
  ON public.shipments (provider, provider_shipment_id);
CREATE INDEX IF NOT EXISTS shipments_order_id_idx ON public.shipments (order_id);
CREATE INDEX IF NOT EXISTS shipments_tracking_code_idx ON public.shipments (tracking_code);

CREATE TABLE IF NOT EXISTS public.shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status text NOT NULL,
  status_raw text,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipment_events_source_check CHECK (source IN ('webhook','manual','poll'))
);

CREATE UNIQUE INDEX IF NOT EXISTS shipment_events_idempotency_key
  ON public.shipment_events (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS shipment_events_shipment_id_idx
  ON public.shipment_events (shipment_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.carrier_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  kind text NOT NULL,
  provider_id integer NOT NULL,
  name text NOT NULL,
  name_key text NOT NULL,
  parent_provider_id integer,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT carrier_regions_kind_check CHECK (kind IN ('state','city'))
);

CREATE UNIQUE INDEX IF NOT EXISTS carrier_regions_unique
  ON public.carrier_regions (provider, kind, provider_id);
CREATE INDEX IF NOT EXISTS carrier_regions_lookup_idx
  ON public.carrier_regions (provider, kind, name_key);

-- =====================================================================
-- 6) ANALİTİK / RIZA (Faz 12)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigserial PRIMARY KEY,
  event text NOT NULL,
  session_id text NOT NULL,
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
    'purchase','signup','newsletter_signup')),
  CONSTRAINT analytics_events_device_check CHECK (device IS NULL OR device IN ('mobile','tablet','desktop','bot'))
);

CREATE INDEX IF NOT EXISTS analytics_events_occurred_idx ON public.analytics_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_occurred_idx ON public.analytics_events (event, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_product_idx ON public.analytics_events (product_id, occurred_at DESC) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx ON public.analytics_events (visitor_id) WHERE visitor_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_purchase_once
  ON public.analytics_events (order_id) WHERE event = 'purchase' AND order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.consent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  categories jsonb NOT NULL,
  version text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'banner'
);

CREATE INDEX IF NOT EXISTS consent_logs_visitor_idx ON public.consent_logs (visitor_id);
CREATE INDEX IF NOT EXISTS consent_logs_occurred_idx ON public.consent_logs (occurred_at DESC);

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

-- ===================== POLİTİKALAR =====================

ALTER TABLE public.products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_billing           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_regions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_product_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs           ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- Vitrin okuması
-- =====================================================================

CREATE POLICY "Anyone can read active campaigns" ON public.campaigns
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read" ON public.collections
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service write" ON public.collections
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read homepage_settings" ON public.homepage_settings
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read approved reviews" ON public.reviews
  FOR SELECT USING (is_approved = true);

-- =====================================================================
-- Sipariş ve talepler
-- =====================================================================

CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (
    ((SELECT auth.uid()) = user_id)
    OR (guest_email = ((SELECT auth.jwt()) ->> 'email'))
  );

CREATE POLICY "allow_insert_orders" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own requests" ON public.order_requests
  FOR SELECT USING (
    order_id IN (SELECT orders.id FROM public.orders WHERE orders.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can insert own requests" ON public.order_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_requests.order_id AND o.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================================
-- Kullanıcıya ait kayıtlar
-- =====================================================================

CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users own addresses" ON public.user_addresses
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users own billing" ON public.user_billing
  FOR ALL USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users manage own wishlist" ON public.wishlists
  FOR ALL USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- =====================================================================
-- Yalnız sunucu (service_role) erişimi — politika YOK, yetki REVOKE
-- Bu tablolara anon/authenticated hiçbir şekilde erişemez; uygulama
-- service_role ile (guard'lı API uçlarından) okur/yazar.
-- =====================================================================

REVOKE ALL ON public.analytics_events        FROM anon, authenticated;
REVOKE ALL ON public.analytics_daily         FROM anon, authenticated;
REVOKE ALL ON public.analytics_product_daily FROM anon, authenticated;
REVOKE ALL ON public.consent_logs            FROM anon, authenticated;
REVOKE ALL ON public.shipments               FROM anon, authenticated;
REVOKE ALL ON public.shipment_events         FROM anon, authenticated;
REVOKE ALL ON public.carrier_regions         FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.analytics_events_id_seq FROM anon, authenticated;

-- order_requests üzerinde anon DML kapalı (kaynakta da böyleydi)
REVOKE INSERT, UPDATE, DELETE ON public.order_requests FROM anon;

-- =====================================================================
-- DOĞRULAMA: aşağıdaki sorgu kaynak projedekiyle aynı sonucu vermeli
--   products 0 · collections 2 · campaigns 1 · homepage_settings 1
--   orders 2 · order_requests 2 · reviews 1 · user_profiles 3
--   user_addresses 1 · user_billing 1 · wishlists 1 · diğerleri 0
-- =====================================================================
-- SELECT tablename, count(*) FROM pg_policies WHERE schemaname='public'
-- GROUP BY tablename ORDER BY tablename;
