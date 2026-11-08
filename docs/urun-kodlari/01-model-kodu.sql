-- Ürün model kodu: Trendyol'daki "Model Kodu" (API'de content.productMainId).
--
-- Neden: 635 Trendyol ürününün 229'unda model kodu barkoddan farklı
-- (ör. barkod NBB115 → model NBB101). Trendyol raporları ürünü model koduyla,
-- siparişler barkodla gösteriyor; panelde ikisi birlikte görünsün diye.
--
-- Yalnız Trendyol senkronu yazar (trendyol_* kuralı). Panelde ürün listesi,
-- ürün detayı ve sipariş detayında gösterilir; vitrin, sepet, ödeme ve Google
-- ürün akışı bu kolonu kullanmaz.
--
-- Kod bu kolondan önce yayına çıkabilir: kolon yokken senkron alanı yazmaz,
-- panel yalnız barkodu gösterir. Kolon eklendikten sonraki ilk senkronda dolar.
--
-- Geri almak için:
--   alter table public.products drop column if exists trendyol_model_code;

alter table public.products add column if not exists trendyol_model_code text;

-- API'nin yeni kolonu hemen görmesi için şema önbelleğini tazele.
notify pgrst, 'reload schema';
