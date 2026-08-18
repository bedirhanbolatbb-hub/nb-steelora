# Taşıma günlüğü

Kaynak: `npvanotrzbqsnxvasmxm` (ap-southeast-1 / Singapur)
Hedef: `halyhtowppivuwpdserp` (**eu-central-1 / Frankfurt**)

> Bu belge taşımanın hangi adımlarının ne zaman ve hangi sonuçla yapıldığını
> kaydeder. Canlı sitenin hangi projeye bağlı olduğu **yalnız Vercel ortam
> değişkenleriyle** belirlenir.

---

## 18 Ağustos 2026 — hazırlık ve veri taşıması (canlı hâlâ ESKİ projede)

### Yapılanlar

| Adım | Durum | Not |
|---|---|---|
| Yeni proje (Frankfurt) | ✅ | BB oluşturdu |
| 01-schema.sql + 02-policies.sql | ✅ | BB SQL Editor'de çalıştırdı — 22 tablo, 15 politika, RLS kapalı tablo 0 |
| Veri kopyası (11 tablo) | ✅ | 923 satır; kaynak = hedef |
| Storage (`media` bucket) | ✅ | public, 10 MB; 1 dosya (287 132 bayt) aynı yolla |
| hero_slides tam URL | ✅ | yeni projeye çevrildi (yalnız yeni projede) |
| `next.config.ts` hostname | ✅ | iki proje birden listede |
| Doğrulama | ✅ | satır sayıları, kritik alanlar, koleksiyon üyeleri, kalıntı taraması |

### Taşınmayan tablolar (bilinçli — test verisi, temiz başlangıç)

`orders` · `order_requests` · `user_profiles` · `user_addresses` · `user_billing` ·
`wishlists` · `analytics_events` · `consent_logs` · `shipments` · `shipment_events` ·
`sync_log`

Bu tabloların yeni projede satır sayısı **0**. Yeni projede Auth kullanıcısı da
oluşturulmadı; ilk gerçek müşteri kaydıyla doğal olarak oluşacak.

### Doğrulama sonucu (kaynak → hedef)

products 520→520 · carrier_regions 312→312 · site_content 36→36 · blog_posts 25→25 ·
homepage_settings 13→13 · analytics_product_daily 10→10 · collections 3→3 ·
campaigns 3→3 · analytics_daily 1→1 · reviews 0→0 · newsletter_subscribers 0→0

Kritik alanlar (hepsi eşit): aktif ürün 433 · products_display 433 ·
override_title dolu 443 · trendyol_barcode dolu 520 · stok=1 aktif 120 ·
yayımlı blog 25 · kapaklı blog 25 · aktif koleksiyon 3 · aktif kampanya 3 ·
künye anahtarı 9 · kargonomi il 81 · kargonomi ilçe 13

Koleksiyon üyeleri: `gunluk-zarafet:8 · hediye-favorileri:6 · statement-pieces:6` (aynı)

Eski proje kimliği kalıntısı (yeni projede): **0** (homepage_settings, site_content,
blog_posts, collections, products).

> **Not:** Faz 13A envanterinde aktif ürün 438 idi; 18 Ağustos 09:50 senkronu
> 433 ürün güncelledi. Fark taşımadan değil, kaynak verinin günlük senkronla
> değişmesinden kaynaklanıyor — kaynak ile hedef aynı andaki hâliyle birebir eşit.

### Yapılmayanlar (bilinçli)

- Vercel ortam değişkenleri **değiştirilmedi** → canlı site hâlâ eski projede.
- Eski projeye **hiçbir yazma** yapılmadı (products 520, orders 11, site_content 36,
  hero URL eski hâliyle duruyor).
- Yeni projede Auth kullanıcısı oluşturulmadı.
- Auth SMTP / şablonlar / URL Configuration henüz kurulmadı (geçiş öncesi gerekli —
  bkz. `06-bb-adimlari.md` Adım 6).

---

## Geçiş için kalanlar

1. Yeni projede **Auth ayarları**: SMTP (`smtp.resend.com` / 465 / `resend`),
   gönderici `NB Steelora <siparis@nbsteelora.com>`, iki mail şablonu,
   URL Configuration (site URL + `/auth/callback`).
2. **Son delta kopyası** (geçişten hemen önce; `03-data-kopyala.mjs` upsert olduğu
   için tekrar çalıştırmak güvenli).
3. **Vercel env swap** + redeploy (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Geçiş sonrası kontrol listesi: `06-bb-adimlari.md` Adım 9.
5. Taşıma kesinleşince KVKK metnindeki Supabase satırı **Frankfurt** olarak
   güncellenmeli (`src/lib/legal/metinler.ts` → `YURTDISI_HTML`).
