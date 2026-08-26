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

# İsim kampanyası v2 — UYGULANDI (26 Ağu, Faz 11A kapanış)

BB 26 Ağustos'ta onayladı ve uygulandı. Aşağısı geri alma için gereken her şeyi taşır.

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

## Ne yazıldı

- **128 ürün satırı** (77 kart + 4 "Li" düzeltmesi) → `override_title` ve `note = 'auto-title-v2'`
- **`trendyol_title` HİÇ değiştirilmedi.** Kanıt: 128 satırın tamamında `trendyol_title`,
  Trendyol API'sinin o barkod için döndürdüğü başlıkla **birebir aynı** (26 Ağu, 513 ürün tarandı).
- Slug/URL değişmedi → feed, sitemap ve mevcut bağlantılar etkilenmedi.
- Kart sayısı değişmedi: **281 → 281**. (Ad grubun TÜM üyelerine yazıldı; yalnız kapağa
  yazılsaydı `getGroupKey` başlığa baktığı için gruplar bölünür ve kart sayısı artardı.)

Sonuç: adı çakışan kart grubu **30 → 3**, etkilenen kart **70 → 7**.

## Uygulanmayan 7 kart

Külçe Kolye ×3 · İnci Kolye ×2 · Simli Kolye ×2. Üç grup da üç bağımsız görsel
incelemesinden (zincir · ton · uç) geçti, 9/9 "ayırt edilemez" dedi. Dahası:

- `K175-1` ile `NBK071`'in iki fotoğrafı **bayt düzeyinde aynı dosya**.
- `NBK082` ile `NBK182` aynı üç fotoğrafı farklı sırayla kullanıyor.
- Külçe üçlüsünde uç aynı plaka ("FINE GOLD 999.9 1000g"), zincir aynı tip.

Bunlar "adlandırılması zor ürünler" değil, büyük olasılıkla **aynı ürünün
tedarikçide birden çok kez listelenmiş hâli** (yalnız fiyat farklı). Ad
uydurulmadı; eski adlar korundu, yalnız tedarikçi başlığından bozulan
"Li" öneki ("2'li"den) düşürüldü. Liste: `docs/isim-kampanyasi-v2-kalanlar.csv`
(panel düzenleme + mağaza bağlantılarıyla).

## Geri almak gerekirse

v2 kendi damgasını taşır; yedek dosyası v2 ÖNCESİ adları tutar:
`docs/isim-kampanyasi-v2-yedek.csv` (`id;slug;kod;override_title_onceki;note_onceki;yeni_ad`).

```sql
-- Tek satırlık geri alma YOK: v2 öncesi adlar v1'den geliyordu, NULL'a çekmek
-- adları uzun Trendyol başlıklarına düşürürdü. Doğru yol yedekten geri yazmak.
-- Hızlı kontrol — kaç satır etkilenmiş:
SELECT count(*) FROM public.products WHERE note = 'auto-title-v2';   -- 128
```

Yedekten geri yazma (servis anahtarıyla, satır satır):

```bash
# docs/isim-kampanyasi-v2-yedek.csv → id;slug;kod;override_title_onceki;...
tail -n +2 docs/isim-kampanyasi-v2-yedek.csv | while IFS=';' read -r id slug kod onceki rest; do
  curl -s -X PATCH "$SUPABASE_URL/rest/v1/products?id=eq.$id" \
    -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"override_title\": \"$onceki\", \"note\": \"auto-title-v1\"}" > /dev/null
done
```

Geri alma sonrası beklenen durum: adı çakışan kart grubu yeniden 30, kart sayısı
yine 281 (kart sayısı addan bağımsız değil ama grup üyeleri birlikte döndüğü için
bölünme olmaz).
