-- Ürün rengi: Trendyol'daki "Renk" özelliği (API'de content.attributes → Renk).
--
-- Neden: vitrinde "altın rengi / gümüş rengi" süzgeci isteniyor (24 Kas 2026
-- tasarım denetimi). Rengi ürün adından çıkarmak işe yaramıyor: gümüş renkli
-- ürünlerin çoğunun adında renk geçmiyor. Trendyol'da bu özellik satıştaki
-- ürünlerin hepsinde dolu (KarPanel verisi, 24 Kas: 431 satırın 431'i;
-- Altın 228, Gümüş 141).
--
-- Yalnız Trendyol senkronu yazar (trendyol_* kuralı). Bu kolon tek başına
-- hiçbir şeyi değiştirmez: süzgeç ve senkron yazımı kolondan SONRA yayına
-- çıkar; kolon eklendikten sonraki ilk senkronda dolar.
--
-- Geri almak için:
--   alter table public.products drop column if exists trendyol_color;

alter table public.products add column if not exists trendyol_color text;

-- API'nin yeni kolonu hemen görmesi için şema önbelleğini tazele.
notify pgrst, 'reload schema';
