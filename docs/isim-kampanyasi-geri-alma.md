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

---

# İsim kampanyası v2 — ÖNERİ (25 Ağu, Faz 11A · **UYGULANMADI**)

Bu bölüm de kayıt amaçlıdır; **hiçbir satır yazılmadı**. Onay bekliyor.

## Sorun

v1 uzun Trendyol başlıklarını kısalttı ama bazı kartlar aynı ada düştü.
Ölçüm (25 Ağu, aktif 430 ürün / 281 kart):

- Adı çakışan **30 grup**, etkilenen **70 kart**
- Ayrıca: 1 marka adı (`Tifany`), 1 yazım hatası (`Makinası`),
  1 üründe malzeme adı (`Pirinç`), 14 kart 5 kelimeden uzun

## Öneri listeleri

- `docs/isim-kampanyasi-v2-oneri.csv` — çakışan 70 kart (kod;grup;eski;yeni;dayanak)
- `docs/isim-kampanyasi-v2-diger.csv` — marka/yazım/uzunluk düzeltmeleri (16 satır)

Adlar ürünün **kendi görselinden** türetildi: motif/biçim + tür, 2–5 kelime.
Tür tek başına ad olarak KULLANILMADI. `Erkek` ve motif kelimesi düşürülmedi.

**8 kart "AYIRT EDİLEMEDİ" işaretli** — görselde ayırt edici fark yok
(Külçe Kolye ×3 aynı uç, farklı zincir; Li İnci Kolye ×2; Li Simli Kolye ×2;
Erkek Kolye ×2 yakın örgü). Bunlara ad UYDURULMADI; BB kararı gerekiyor.

## Uygulanırsa

- Yazılacak kolonlar: `override_title`, `note = 'auto-title-v2'`
- **`trendyol_title` HİÇ değiştirilmez** (v1 kuralı aynen sürer)
- Slug/URL değişmez → feed, sitemap ve mevcut bağlantılar etkilenmez

## Geri almak gerekirse

v2 kendi damgasını taşır, v1'e dokunmadan geri alınabilir:

```sql
-- v2'nin yazdığı adları v1'in bıraktığı hâle DÖNDÜRMEZ; boşaltır.
-- v1 adını korumak için önce v2 öncesi override_title yedeği alınmalıdır.
UPDATE public.products
SET note = 'auto-title-v1'
WHERE note = 'auto-title-v2';
```

Bu yüzden uygulama sırasında **v2 öncesi `id;override_title` yedeği CSV olarak
alınır** (`docs/isim-kampanyasi-v2-yedek.csv`) ve geri alma o dosyadan yapılır.
