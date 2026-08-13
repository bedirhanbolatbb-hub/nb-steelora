# İsim kampanyası v1 — geri alma notu

Bu belge yalnızca kayıt amaçlıdır; **hiçbir adımı uygulanmadı**.

## Kampanya neydi

Faz 2C'de `override_title` boş olan aktif ürünlerde görünen ad, uzun Trendyol
başlığından türetilen kısa adla değiştirildi (404 ürün). Faz 3'te otomatik
üretimin ad veremediği 10 ürün, ürün görsellerine bakılarak elle adlandırıldı.
Yazılan her satır `note = 'auto-title-v1'` ile işaretlendi.

- Etkilenen satır: **414** (404 otomatik + 10 elle)
- Dokunulmayanlar: `override_title` zaten dolu olan 26 ürün
- Yazılan kolonlar: `override_title`, `note`
- **`trendyol_title` hiç değiştirilmedi** — SEO başlığı ve meta açıklaması hâlâ uzun addan üretiliyor.

Tam liste: `docs/isim-kampanyasi-v1.csv` (barkod;eski_ad;yeni_ad)
Atlananlar: `docs/isim-kampanyasi-v1-atlananlar.csv` (10 ürün Faz 3-madde 0 ile görsellerine bakılarak adlandırıldı)

## Geri almak gerekirse

Tek adım: `note = 'auto-title-v1'` olan satırlarda `override_title` ve `note`
alanlarını boşaltmak. Bu, görünen adı otomatik olarak `trendyol_title`'a geri
düşürür (`products_display.display_title` zaten `COALESCE(override_title, trendyol_title)`).

```sql
-- Yalnız kampanyanın yazdığı satırlar etkilenir; elle girilmiş adlara dokunmaz.
UPDATE public.products
SET override_title = NULL,
    note = NULL
WHERE note = 'auto-title-v1';
```

Servis anahtarıyla REST üzerinden aynı işlem:

```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/products?note=eq.auto-title-v1" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"override_title": null, "note": null}'
```

Geri alma sonrası beklenen durum: `/urunler` kart sayısı 282 → 304, ürün adları
uzun Trendyol başlıklarına döner. Slug/URL, feed ve sitemap etkilenmez.
