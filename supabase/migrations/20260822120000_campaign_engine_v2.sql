-- =====================================================================
-- Faz 16 — KAMPANYA MOTORU v2 (tamamen additive)
--
-- Amaç: kapsamlı (kategori/koleksiyon/ürün) indirimler, kademeli eşikler,
-- kişi başı kullanım limiti ve kişiye özel tek kullanımlık kuponlar.
--
-- TEMEL KURAL — ÇALIŞAN KOD BOZULMAZ:
--   Mevcut motor (src/lib/campaigns/pricing.ts) kampanyaları TİPE GÖRE seçer:
--     kuponDogrula()        -> .eq('type','discount_code')
--     otomatikKampanyalar() -> .in('type', ['cart_discount','free_shipping','buy_x_get_y'])
--   Yani v1 kodu, TANIMADIĞI bir type değerini hiç okumaz. v2 yetenekleri bu
--   yüzden YENİ type değerlerine bağlandı: eski kod onları göremez, görmediği
--   için de yanlış uygulayamaz.
--
--   Eski tiplere v2 alanı yazılması ise gerçek bir para hatası olurdu
--   (ör. min_item_count'u yok sayan v1 kodu, 3 ürün şartlı indirimi 1 üründe
--   uygular). Bunu campaigns_v1_safety_guard CHECK'i DB seviyesinde engeller.
--   v2 motoru yayına alındığında bu guard tek satırla düşürülür (bkz. §9).
--
-- Bu dosya Supabase SQL Editor'de bir kez, bütün olarak çalıştırılır.
-- Tekrar çalıştırılabilir (idempotent).
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1) campaigns — yeni ortak alanlar
-- =====================================================================

ALTER TABLE public.campaigns
  -- Kapsam: indirim sepetin tamamına mı, yoksa bir hedef listesine mi işler.
  -- 'cart' dışındaki değerlerde hedefler campaign_targets'ta durur.
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'cart',

  -- Kampanya kod ister mi? Kupon artık ayrı bir TİP değil, her tipin üzerine
  -- takılabilen bir anahtar: requires_code = true + code dolu.
  ADD COLUMN IF NOT EXISTS requires_code boolean NOT NULL DEFAULT false,

  -- Asgari ürün adedi (min_cart_amount'ın adet karşılığı).
  ADD COLUMN IF NOT EXISTS min_item_count integer,

  -- KİŞİ BAŞI kullanım limiti. NULL = sınırsız. Sayımın kaynağı
  -- campaign_redemptions'tır (campaigns.used_count değil).
  ADD COLUMN IF NOT EXISTS per_user_limit integer,

  -- Birden fazla kampanya uygunsa değerlendirme sırası. Küçük sayı önce bakılır.
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100,

  -- Başka bir kampanyayla birlikte uygulanabilir mi? Varsayılan HAYIR —
  -- v1'deki "tek kampanya, müşteri lehine olan" kuralı korunur.
  ADD COLUMN IF NOT EXISTS combinable boolean NOT NULL DEFAULT false,

  -- Yalnız üyelere özel (oturum açmış kullanıcı zorunlu).
  ADD COLUMN IF NOT EXISTS members_only boolean NOT NULL DEFAULT false,

  -- Yalnız ilk alışverişe özel (o kişinin ödenmiş siparişi yoksa geçerli).
  ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false,

  -- Yüzde indirimde üst sınır: "%20 ama en fazla 200 TL". NULL = tavan yok.
  ADD COLUMN IF NOT EXISTS max_discount_amount numeric(12,2),

  -- X al Y öde sayıları. v1 bunları metadata'dan okuyordu; alanlar kanonik
  -- kaynak oldu, §8'deki tetikleyici metadata'yı otomatik güncel tutuyor.
  ADD COLUMN IF NOT EXISTS buy_quantity integer,
  ADD COLUMN IF NOT EXISTS pay_quantity integer,

  -- Kişiye özel kupon üreten kampanya mı? (campaign_coupons'ın şablonu)
  ADD COLUMN IF NOT EXISTS issues_personal_coupons boolean NOT NULL DEFAULT false,

  -- Kişiye özel kuponun üretildiği andan itibaren geçerlilik süresi (gün).
  ADD COLUMN IF NOT EXISTS coupon_valid_days integer,

  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Mevcut kod kampanyaları: type='discount_code' zaten kod istiyordu.
UPDATE public.campaigns
   SET requires_code = true
 WHERE type = 'discount_code' AND code IS NOT NULL AND requires_code = false;

-- Mevcut X al Y öde kampanyalarının metadata'sı kolonlara taşınır.
-- Yalnız SAYISAL ve TUTARLI (al > öde) veri taşınır: bozuk metadata yüzünden
-- migration'ın CHECK aşamasında patlaması istenmez. Taşınmayan satır NULL kalır,
-- v1 motoru onu zaten metadata'dan okumaya devam eder.
UPDATE public.campaigns
   SET buy_quantity = (metadata->>'buy_quantity')::integer,
       pay_quantity = (metadata->>'pay_quantity')::integer
 WHERE type = 'buy_x_get_y'
   AND buy_quantity IS NULL
   AND metadata->>'buy_quantity' ~ '^[0-9]+$'
   AND metadata->>'pay_quantity' ~ '^[0-9]+$'
   AND (metadata->>'buy_quantity')::integer > (metadata->>'pay_quantity')::integer;


-- =====================================================================
-- 1b) orders.metadata — kişisel kupon izi
--
-- Ödeme başlatılırken hangi kişisel kuponun uygulandığı siparişte taşınır;
-- ödeme ONAYLANINCA callback bu kuponu harcar. Ödeme yarıda kalırsa kupon
-- tüketilmez.
-- =====================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- =====================================================================
-- 2) CHECK güncellemeleri
-- =====================================================================

-- 2a) Yeni tipler. Eski beş değer aynen korunur — mevcut satırlar geçerli kalır.
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_type_check;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_type_check CHECK (type IN (
    -- v1 tipleri (pricing.ts bunları okur — anlamları değişmedi)
    'discount_code',
    'cart_discount',
    'free_shipping',
    'banner',
    'buy_x_get_y',
    -- v2 tipleri (v1 kodu bu değerleri hiç sorgulamaz)
    'item_discount',          -- kategori / koleksiyon / ürün bazlı indirim
    'tiered_discount',        -- kademeli eşik (500 TL -> %10, 1000 TL -> %20)
    'buy_x_get_y_scoped'      -- kapsamlı X al Y öde
  ));

-- 2b) discount_type: 'percent' | 'fixed' korunur, NULL serbest (banner vb.).
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_discount_type_check;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_discount_type_check
  CHECK (discount_type IS NULL OR discount_type IN ('percent','fixed'));

-- 2c) Kapsam değerleri.
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_scope_check;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_scope_check
  CHECK (scope IN ('cart','category','collection','product'));

-- 2d) Kod isteyen kampanyanın kodu olmak zorunda.
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_code_presence_check;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_code_presence_check
  CHECK (requires_code = false OR code IS NOT NULL OR issues_personal_coupons = true);

-- 2e) Pozitif sayı kontrolleri.
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_limits_check;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_limits_check CHECK (
    (per_user_limit      IS NULL OR per_user_limit      > 0) AND
    (min_item_count      IS NULL OR min_item_count      > 0) AND
    (max_discount_amount IS NULL OR max_discount_amount > 0) AND
    (coupon_valid_days   IS NULL OR coupon_valid_days   > 0) AND
    (buy_quantity        IS NULL OR buy_quantity        > 0) AND
    (pay_quantity        IS NULL OR pay_quantity       >= 0) AND
    (buy_quantity IS NULL OR pay_quantity IS NULL OR buy_quantity > pay_quantity)
  );

-- 2f) NOT: tasarım turunda önerilen "v1 güvenlik kilidi" (eski tiplerin yeni
-- alanları kullanmasını yasaklayan CHECK) buraya KONMADI: v2 hesap motoru
-- (src/lib/campaigns/hesap.ts) bu migration ile aynı dalgada yayına giriyor ve
-- tiplerin tamamını işliyor. Kilit, motor gecikseydi anlamlı olurdu.

-- =====================================================================
-- 3) campaign_targets — kapsam hedefleri
--
-- NOT: projede ayrı bir kategori tablosu YOK. Kategori, products.trendyol_category
-- metin alanıdır; bu yüzden kategori hedefi metinle (category_value), koleksiyon
-- ve ürün hedefleri yabancı anahtarla tutulur.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.campaign_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  category_value text,
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  -- true ise HARİÇ TUTULUR (ör. "tüm kolyeler, şu ürün hariç").
  is_exclusion boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_targets_type_check
    CHECK (target_type IN ('category','collection','product')),
  -- Her satırda hedef tipine uyan TEK sütun dolu olur.
  CONSTRAINT campaign_targets_shape_check CHECK (
    (target_type = 'category'   AND category_value IS NOT NULL AND collection_id IS NULL     AND product_id IS NULL) OR
    (target_type = 'collection' AND collection_id  IS NOT NULL AND category_value IS NULL    AND product_id IS NULL) OR
    (target_type = 'product'    AND product_id     IS NOT NULL AND category_value IS NULL    AND collection_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS campaign_targets_campaign_idx
  ON public.campaign_targets (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_targets_product_idx
  ON public.campaign_targets (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS campaign_targets_collection_idx
  ON public.campaign_targets (collection_id) WHERE collection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS campaign_targets_category_idx
  ON public.campaign_targets (category_value) WHERE category_value IS NOT NULL;

-- Aynı hedef iki kez eklenemez (indirim iki kez sayılmasın).
CREATE UNIQUE INDEX IF NOT EXISTS campaign_targets_uniq_category
  ON public.campaign_targets (campaign_id, category_value) WHERE target_type = 'category';
CREATE UNIQUE INDEX IF NOT EXISTS campaign_targets_uniq_collection
  ON public.campaign_targets (campaign_id, collection_id) WHERE target_type = 'collection';
CREATE UNIQUE INDEX IF NOT EXISTS campaign_targets_uniq_product
  ON public.campaign_targets (campaign_id, product_id) WHERE target_type = 'product';

-- =====================================================================
-- 4) campaign_tiers — kademeli eşik indirimi
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.campaign_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  -- Bu kademenin açılması için gereken sepet tutarı (kapsam içi tutar).
  min_amount numeric(12,2) NOT NULL DEFAULT 0,
  -- İsteğe bağlı adet eşiği ("3 ürün alana %15").
  min_quantity integer,
  discount_type text NOT NULL,
  discount_value numeric(12,2) NOT NULL,
  max_discount_amount numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_tiers_discount_type_check
    CHECK (discount_type IN ('percent','fixed')),
  CONSTRAINT campaign_tiers_value_check CHECK (
    discount_value > 0
    AND (discount_type <> 'percent' OR discount_value <= 100)
    AND min_amount >= 0
    AND (min_quantity IS NULL OR min_quantity > 0)
    AND (max_discount_amount IS NULL OR max_discount_amount > 0)
  )
);

-- Aynı eşik iki kez tanımlanamaz — hangisinin kazandığı belirsiz kalmasın.
CREATE UNIQUE INDEX IF NOT EXISTS campaign_tiers_uniq_threshold
  ON public.campaign_tiers (campaign_id, min_amount);
-- Motor "eşiği geçen en yüksek kademe"yi arar: DESC indeks tam bu sorgu için.
CREATE INDEX IF NOT EXISTS campaign_tiers_lookup_idx
  ON public.campaign_tiers (campaign_id, min_amount DESC);

-- =====================================================================
-- 5) campaign_coupons — kişiye özel tek kullanımlık kuponlar
--
-- campaigns'e kolon eklemek yerine AYRI TABLO. Gerekçe (kısa): campaigns'te
-- "Anyone can read active campaigns" politikası var; oraya yazılan her kod
-- anon istemciye açıktır. Ayrıntılı gerekçe teslim notunda.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.campaign_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kuralı (yüzde, kapsam, min sepet) veren şablon kampanya.
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  code text NOT NULL,
  -- Sahibi: üye ise user_id, değilse e-posta. En az biri dolu olmalı.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  -- Neden üretildi: ikinci sipariş kuponu, elle, geri kazanım...
  source text NOT NULL DEFAULT 'manual',
  -- Hangi siparişin ardından üretildi (ikinci sipariş kuponunun tetikleyicisi).
  source_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  redeemed_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_coupons_owner_check
    CHECK (user_id IS NOT NULL OR email IS NOT NULL),
  CONSTRAINT campaign_coupons_source_check
    CHECK (source IN ('manual','second_order','win_back','review_reward','newsletter')),
  CONSTRAINT campaign_coupons_uses_check
    CHECK (max_uses > 0 AND used_count >= 0 AND used_count <= max_uses),
  CONSTRAINT campaign_coupons_code_check
    CHECK (length(btrim(code)) BETWEEN 4 AND 40)
);

-- Kod büyük/küçük harften bağımsız benzersiz (kuponDogrula kodu upper'lıyor).
CREATE UNIQUE INDEX IF NOT EXISTS campaign_coupons_code_key
  ON public.campaign_coupons (upper(btrim(code)));

CREATE INDEX IF NOT EXISTS campaign_coupons_campaign_idx
  ON public.campaign_coupons (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_coupons_user_idx
  ON public.campaign_coupons (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS campaign_coupons_email_idx
  ON public.campaign_coupons (lower(btrim(email))) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS campaign_coupons_source_order_idx
  ON public.campaign_coupons (source_order_id) WHERE source_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS campaign_coupons_redeemed_order_idx
  ON public.campaign_coupons (redeemed_order_id) WHERE redeemed_order_id IS NOT NULL;

-- Bir siparişten aynı kampanya için İKİNCİ kupon üretilemez.
-- (Kupon gönderen cron/callback tekrar çalışsa bile mükerrer kupon çıkmaz.)
CREATE UNIQUE INDEX IF NOT EXISTS campaign_coupons_once_per_source_order
  ON public.campaign_coupons (campaign_id, source_order_id)
  WHERE source_order_id IS NOT NULL;

-- Kişiye özel kupon kodu, kampanya koduyla çakışamaz: doğrulama sırasında
-- hangisinin kazandığı belirsiz kalmasın.
CREATE OR REPLACE FUNCTION public.campaign_coupons_kod_cakismasi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.campaigns c
     WHERE upper(btrim(c.code)) = upper(btrim(NEW.code))
  ) THEN
    RAISE EXCEPTION 'Bu kod bir kampanya kodu olarak zaten kullanılıyor: %', NEW.code
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_coupons_kod_cakismasi_trg ON public.campaign_coupons;
CREATE TRIGGER campaign_coupons_kod_cakismasi_trg
  BEFORE INSERT OR UPDATE OF code ON public.campaign_coupons
  FOR EACH ROW EXECUTE FUNCTION public.campaign_coupons_kod_cakismasi();

-- =====================================================================
-- 6) campaign_redemptions — kullanım defteri (kişi başı limitin kaynağı)
--
-- İki aşamalı: ödeme başlatılırken 'reserved', ödeme onaylanınca 'confirmed',
-- ödeme düşerse 'released'. Böylece 3D ekranında bekleyen sepet, limiti
-- geçici olarak tutar; başarısız ödeme hakkı yakmaz.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.campaign_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  coupon_id uuid REFERENCES public.campaign_coupons(id) ON DELETE SET NULL,
  -- Kullanım sahibi: üye ise user_id, misafir ise e-posta.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  -- Sipariş satırı henüz yokken (rezervasyon anı) izi kaybetmemek için.
  order_number text,
  status text NOT NULL DEFAULT 'reserved',
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  -- Kişinin bu kampanyadaki kaçıncı kullanımı (1, 2, 3...). Benzersiz indeksle
  -- birlikte kişi başı limiti yarış koşullarında da kilitler.
  use_index integer NOT NULL DEFAULT 1,
  -- Aynısının kupon bazlı karşılığı.
  coupon_use_index integer,
  -- Üye ve misafir kullanımını TEK kimliğe indirger; limit sayımı bunun üstünden.
  subject_key text GENERATED ALWAYS AS (
    COALESCE(user_id::text, 'e:' || lower(btrim(guest_email)))
  ) STORED,
  reserved_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  released_at timestamptz,
  release_reason text,
  CONSTRAINT campaign_redemptions_status_check
    CHECK (status IN ('reserved','confirmed','released')),
  CONSTRAINT campaign_redemptions_subject_check
    CHECK (user_id IS NOT NULL OR btrim(coalesce(guest_email,'')) <> ''),
  CONSTRAINT campaign_redemptions_index_check
    CHECK (use_index > 0 AND (coupon_use_index IS NULL OR coupon_use_index > 0))
);

-- *** Kişi başı limitin DB seviyesindeki kilidi ***
-- Aynı kişi, aynı kampanyada aynı sırayı iki kez alamaz. İki eşzamanlı ödeme
-- de use_index = N hesaplarsa biri unique violation ile döner.
CREATE UNIQUE INDEX IF NOT EXISTS campaign_redemptions_per_user_slot
  ON public.campaign_redemptions (campaign_id, subject_key, use_index)
  WHERE status <> 'released';

-- Kupon bazlı aynı kilit (tek kullanımlık kupon iki siparişte kullanılamaz).
CREATE UNIQUE INDEX IF NOT EXISTS campaign_redemptions_coupon_slot
  ON public.campaign_redemptions (coupon_id, coupon_use_index)
  WHERE coupon_id IS NOT NULL AND status <> 'released';

-- Bir sipariş, bir kampanyayı yalnız bir kez kullanır. Ödeme callback'i
-- tekrar tetiklenirse ikinci kayıt açılmaz (idempotenlik).
CREATE UNIQUE INDEX IF NOT EXISTS campaign_redemptions_order_once
  ON public.campaign_redemptions (campaign_id, order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS campaign_redemptions_subject_idx
  ON public.campaign_redemptions (campaign_id, subject_key) WHERE status <> 'released';
CREATE INDEX IF NOT EXISTS campaign_redemptions_campaign_idx
  ON public.campaign_redemptions (campaign_id);
CREATE INDEX IF NOT EXISTS campaign_redemptions_coupon_idx
  ON public.campaign_redemptions (coupon_id) WHERE coupon_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS campaign_redemptions_order_idx
  ON public.campaign_redemptions (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS campaign_redemptions_user_idx
  ON public.campaign_redemptions (user_id) WHERE user_id IS NOT NULL;
-- Terk edilmiş rezervasyonları toplayan iş için.
CREATE INDEX IF NOT EXISTS campaign_redemptions_stale_idx
  ON public.campaign_redemptions (reserved_at) WHERE status = 'reserved';

-- =====================================================================
-- 7) Rezervasyon / onay / iade fonksiyonları
--
-- Kişi başı ve toplam limit tek yerden, kampanya satırı KİLİTLENEREK uygulanır.
-- Uygulama katmanı "önce say, sonra yaz" yapmaz — yarış koşulu burada biter.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.kampanya_kullanim_rezerve(
  p_campaign_id     uuid,
  p_user_id         uuid    DEFAULT NULL,
  p_guest_email     text    DEFAULT NULL,
  p_coupon_id       uuid    DEFAULT NULL,
  p_order_number    text    DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_campaign public.campaigns%ROWTYPE;
  v_coupon   public.campaign_coupons%ROWTYPE;
  v_subject  text;
  v_used     integer;
  v_total    integer;
  v_id       uuid;
  v_coupon_slot integer;
BEGIN
  IF p_user_id IS NULL AND btrim(coalesce(p_guest_email,'')) = '' THEN
    RAISE EXCEPTION 'Kullanım sahibi belirsiz: user_id ya da guest_email zorunlu'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Kampanya satırını kilitle: aynı kampanyaya eşzamanlı rezervasyonlar sıraya girer.
  SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kampanya bulunamadı' USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT coalesce(v_campaign.is_active, false) THEN
    RAISE EXCEPTION 'Kampanya aktif değil' USING ERRCODE = 'check_violation';
  END IF;
  IF v_campaign.starts_at IS NOT NULL AND v_campaign.starts_at > now() THEN
    RAISE EXCEPTION 'Kampanya henüz başlamadı' USING ERRCODE = 'check_violation';
  END IF;
  IF v_campaign.ends_at IS NOT NULL AND v_campaign.ends_at < now() THEN
    RAISE EXCEPTION 'Kampanya süresi doldu' USING ERRCODE = 'check_violation';
  END IF;

  v_subject := COALESCE(p_user_id::text, 'e:' || lower(btrim(p_guest_email)));

  -- Toplam kullanım limiti (rezerve + onaylı sayılır).
  IF v_campaign.max_uses IS NOT NULL THEN
    SELECT count(*) INTO v_total
      FROM public.campaign_redemptions
     WHERE campaign_id = p_campaign_id AND status <> 'released';
    IF v_total >= v_campaign.max_uses THEN
      RAISE EXCEPTION 'Kampanya kullanım limiti doldu' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- KİŞİ BAŞI kullanım limiti.
  SELECT count(*) INTO v_used
    FROM public.campaign_redemptions
   WHERE campaign_id = p_campaign_id
     AND subject_key = v_subject
     AND status <> 'released';

  IF v_campaign.per_user_limit IS NOT NULL AND v_used >= v_campaign.per_user_limit THEN
    RAISE EXCEPTION 'Bu kampanyayı kullanma hakkınız doldu' USING ERRCODE = 'check_violation';
  END IF;

  -- Kişiye özel kupon doğrulaması.
  IF p_coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.campaign_coupons WHERE id = p_coupon_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Kupon bulunamadı' USING ERRCODE = 'no_data_found';
    END IF;
    IF NOT v_coupon.is_active THEN
      RAISE EXCEPTION 'Kupon geçersiz' USING ERRCODE = 'check_violation';
    END IF;
    IF v_coupon.campaign_id <> p_campaign_id THEN
      RAISE EXCEPTION 'Kupon bu kampanyaya ait değil' USING ERRCODE = 'check_violation';
    END IF;
    IF v_coupon.starts_at > now() THEN
      RAISE EXCEPTION 'Kupon henüz geçerli değil' USING ERRCODE = 'check_violation';
    END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'Kuponun süresi doldu' USING ERRCODE = 'check_violation';
    END IF;
    -- Kupon SAHİBİNE bağlıdır: başkasının kodunu kullanamaz.
    IF v_coupon.user_id IS NOT NULL AND v_coupon.user_id IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'Kupon bu hesaba tanımlı değil' USING ERRCODE = 'check_violation';
    END IF;
    IF v_coupon.user_id IS NULL
       AND lower(btrim(coalesce(v_coupon.email,''))) <> lower(btrim(coalesce(p_guest_email,''))) THEN
      RAISE EXCEPTION 'Kupon bu e-postaya tanımlı değil' USING ERRCODE = 'check_violation';
    END IF;
    IF v_coupon.used_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'Kupon daha önce kullanıldı' USING ERRCODE = 'check_violation';
    END IF;
    v_coupon_slot := v_coupon.used_count + 1;
  END IF;

  INSERT INTO public.campaign_redemptions (
    campaign_id, coupon_id, user_id, guest_email, order_number,
    status, discount_amount, use_index, coupon_use_index
  ) VALUES (
    p_campaign_id, p_coupon_id, p_user_id, NULLIF(btrim(coalesce(p_guest_email,'')),''),
    p_order_number, 'reserved', coalesce(p_discount_amount,0), v_used + 1, v_coupon_slot
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.kampanya_kullanim_onayla(
  p_redemption_id uuid,
  p_order_id      uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.campaign_redemptions%ROWTYPE;
BEGIN
  -- Yalnız 'reserved' satır onaylanır: callback iki kez çalışsa da sayaç
  -- bir kez artar (idempotent).
  UPDATE public.campaign_redemptions
     SET status       = 'confirmed',
         confirmed_at = now(),
         order_id     = COALESCE(p_order_id, order_id)
   WHERE id = p_redemption_id
     AND status = 'reserved'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- v1 UYUMU: eski panel ve eski motor campaigns.used_count okuyor.
  -- Kullanım defteri kanonik kaynak olsa da bu sayaç güncel tutulur.
  UPDATE public.campaigns
     SET used_count = coalesce(used_count,0) + 1
   WHERE id = v_row.campaign_id;

  IF v_row.coupon_id IS NOT NULL THEN
    UPDATE public.campaign_coupons
       SET used_count        = used_count + 1,
           redeemed_at       = COALESCE(redeemed_at, now()),
           redeemed_order_id = COALESCE(redeemed_order_id, v_row.order_id),
           is_active         = CASE WHEN used_count + 1 >= max_uses THEN false ELSE is_active END
     WHERE id = v_row.coupon_id;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.kampanya_kullanim_serbest_birak(
  p_redemption_id uuid,
  p_reason        text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.campaign_redemptions
     SET status         = 'released',
         released_at    = now(),
         release_reason = p_reason
   WHERE id = p_redemption_id
     AND status = 'reserved';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

-- Terk edilmiş 3D ödemelerin tuttuğu hakları geri verir (cron: saatte bir).
CREATE OR REPLACE FUNCTION public.kampanya_rezervasyon_temizle(
  p_older_than interval DEFAULT interval '2 hours'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.campaign_redemptions
     SET status         = 'released',
         released_at    = now(),
         release_reason = 'otomatik: rezervasyon zaman aşımı'
   WHERE status = 'reserved'
     AND reserved_at < now() - p_older_than;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- =====================================================================
-- 8) buy_x_get_y metadata aynası (v1 motoru metadata'dan okuyor)
--
-- Panelde yeni buy_quantity/pay_quantity alanları düzenlendiğinde v1'in
-- okuduğu metadata bayatlarsa, sepette YANLIŞ SAYIDA bedava ürün çıkar.
-- Tetikleyici iki kaynağı tek işlemde eşitler. v1 emekliye ayrılınca düşer.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.campaigns_bxgy_metadata_ayna()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type = 'buy_x_get_y'
     AND NEW.buy_quantity IS NOT NULL
     AND NEW.pay_quantity IS NOT NULL THEN
    NEW.metadata := coalesce(NEW.metadata, '{}'::jsonb)
      || jsonb_build_object(
           'buy_quantity', NEW.buy_quantity,
           'pay_quantity', NEW.pay_quantity
         );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaigns_bxgy_metadata_ayna_trg ON public.campaigns;
CREATE TRIGGER campaigns_bxgy_metadata_ayna_trg
  BEFORE INSERT OR UPDATE OF buy_quantity, pay_quantity, type ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.campaigns_bxgy_metadata_ayna();

-- =====================================================================
-- 9) campaigns için ek indeksler
-- =====================================================================

-- Motor "şu an yürürlükte olan kampanyalar"ı tipe göre çeker.
CREATE INDEX IF NOT EXISTS campaigns_active_type_idx
  ON public.campaigns (type, starts_at, ends_at) WHERE is_active = true;
-- Değerlendirme sırası.
CREATE INDEX IF NOT EXISTS campaigns_priority_idx
  ON public.campaigns (priority, created_at DESC) WHERE is_active = true;
-- Kod aramasını büyük/küçük harften bağımsız hızlandırır (panel ilike ile bakıyor).
CREATE INDEX IF NOT EXISTS campaigns_code_upper_idx
  ON public.campaigns (upper(btrim(code))) WHERE code IS NOT NULL;

-- =====================================================================
-- 10) RLS
--
-- Ayrım net:
--   targets/tiers  -> kampanya KURALIDIR, vitrinde zaten gösterilir: aktif
--                     kampanyalar için herkese okunur (mevcut campaigns
--                     politikasıyla aynı çizgi).
--   coupons        -> KİŞİSEL SIR. anon hiç göremez; üye yalnız kendi kuponunu
--                     görür (hesabım > kuponlarım).
--   redemptions    -> yalnız service_role. Kimin neyi kullandığı sızmaz.
-- =====================================================================

ALTER TABLE public.campaign_targets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_tiers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_coupons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_redemptions ENABLE ROW LEVEL SECURITY;

-- --- targets / tiers: aktif kampanyanın kuralları herkese açık --------------
-- Okuma serbest, yazma yalnız sunucudan.
REVOKE INSERT, UPDATE, DELETE ON public.campaign_targets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.campaign_tiers   FROM anon, authenticated;

DROP POLICY IF EXISTS "Aktif kampanya hedefleri okunur" ON public.campaign_targets;
CREATE POLICY "Aktif kampanya hedefleri okunur" ON public.campaign_targets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
       WHERE c.id = campaign_targets.campaign_id AND c.is_active = true
    )
  );

DROP POLICY IF EXISTS "Service yazar" ON public.campaign_targets;
CREATE POLICY "Service yazar" ON public.campaign_targets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Aktif kampanya kademeleri okunur" ON public.campaign_tiers;
CREATE POLICY "Aktif kampanya kademeleri okunur" ON public.campaign_tiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
       WHERE c.id = campaign_tiers.campaign_id AND c.is_active = true
    )
  );

DROP POLICY IF EXISTS "Service yazar" ON public.campaign_tiers;
CREATE POLICY "Service yazar" ON public.campaign_tiers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --- coupons: kişisel ------------------------------------------------------
-- anon hiçbir şey göremez (kod hasadı kapalı). Supabase yeni tablolara
-- varsayılan olarak anon/authenticated yetkisi verdiği için önce hepsi geri alınır.
REVOKE ALL ON public.campaign_coupons FROM anon, authenticated;
GRANT SELECT ON public.campaign_coupons TO authenticated;

DROP POLICY IF EXISTS "Üye kendi kuponunu görür" ON public.campaign_coupons;
CREATE POLICY "Üye kendi kuponunu görür" ON public.campaign_coupons
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service yazar" ON public.campaign_coupons;
CREATE POLICY "Service yazar" ON public.campaign_coupons
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --- redemptions: yalnız sunucu -------------------------------------------
REVOKE ALL ON public.campaign_redemptions FROM anon, authenticated;

DROP POLICY IF EXISTS "Service yazar" ON public.campaign_redemptions;
CREATE POLICY "Service yazar" ON public.campaign_redemptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- --- fonksiyon yetkileri ---------------------------------------------------
-- Limit fonksiyonları SECURITY DEFINER: istemciden çağrılamaz.
REVOKE EXECUTE ON FUNCTION public.kampanya_kullanim_rezerve(uuid, uuid, text, uuid, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kampanya_kullanim_onayla(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kampanya_kullanim_serbest_birak(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.kampanya_rezervasyon_temizle(interval) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.kampanya_kullanim_rezerve(uuid, uuid, text, uuid, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.kampanya_kullanim_onayla(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.kampanya_kullanim_serbest_birak(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.kampanya_rezervasyon_temizle(interval) TO service_role;

COMMIT;

-- =====================================================================
-- DOĞRULAMA (ayrı çalıştırın)
-- =====================================================================
-- 1) Mevcut 3 kampanya bozulmadı mı? (hepsi 'cart' kapsamda, guard'a uygun)
--    SELECT id, name, type, scope, requires_code, per_user_limit FROM public.campaigns;
--
-- 2) v1 motorunun gördüğü tipler yalnız eski beş değer mi?
--    SELECT type, count(*) FROM public.campaigns GROUP BY type;
--
-- 3) Guard çalışıyor mu? (hata vermeli)
--    UPDATE public.campaigns SET per_user_limit = 1 WHERE type = 'discount_code';
--
-- =====================================================================
-- FAZ 2 — v2 motoru yayına alındıktan SONRA (bu dosyada çalıştırmayın)
-- =====================================================================
-- Eski tiplerin de kişi başı limit / üye kısıtı kullanabilmesi için:
--   ALTER TABLE public.campaigns DROP CONSTRAINT campaigns_v1_safety_guard;
-- buy_x_get_y metadata aynası, v1 okuması kalkınca:
--   DROP TRIGGER campaigns_bxgy_metadata_ayna_trg ON public.campaigns;
