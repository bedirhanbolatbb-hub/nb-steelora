# Kaynak proje envanteri — 18 Ağustos 2026

Kaynak: `npvanotrzbqsnxvasmxm` · **ap-southeast-1 (Singapur)** · Postgres 17.6
Hedef: yeni proje · **eu-central-1 (Frankfurt)**

> Bu envanter salt okuma sorgularıyla çıkarıldı; kaynak projeye hiçbir yazma yapılmadı.

## Tablolar ve satır sayıları

| Tablo | Satır | Sütun | Boyut | RLS | Politika |
|---|---:|---:|---|---|---:|
| products | **520** | 29 | 2 248 kB | ✓ | 0 |
| carrier_regions | **312** | 8 | 176 kB | ✓ | 0 |
| sync_log | 187 | 9 | 80 kB | ✓ | 0 |
| analytics_events | 64 | 14 | 152 kB | ✓ | 0 |
| site_content | 36 | 3 | 32 kB | ✓ | 0 |
| blog_posts | 25 | 13 | 176 kB | ✓ | 0 |
| homepage_settings | 13 | 5 | 64 kB | ✓ | 1 |
| orders | 11 | 24 | 72 kB | ✓ | 2 |
| order_requests | 5 | 14 | 64 kB | ✓ | 2 |
| campaigns | 3 | 17 | 48 kB | ✓ | 1 |
| collections | 3 | 9 | 48 kB | ✓ | 2 |
| user_profiles / user_addresses / user_billing / wishlists | 1'er | — | 32–64 kB | ✓ | 3/1/1/1 |
| reviews · newsletter_subscribers · shipments · shipment_events · consent_logs · analytics_daily · analytics_product_daily | 0 | — | — | ✓ | 1/0/0/0/0/0/0 |

**Toplam:** 22 tablo · 1 görünüm (`products_display`) · ~3,6 MB

## Görünüm, fonksiyon, uzantı

- **View:** `products_display` — yalnız `is_active = true`; `display_title`,
  `display_price`, `display_images` COALESCE ile türetilir.
- **Fonksiyon:** `rls_auto_enable()` — Supabase'in yeni tablolarda RLS'i otomatik
  açan event trigger'ı (platform tarafından yönetilir, taşınmasına gerek yok).
- **Trigger:** özel trigger yok.
- **Uzantılar:** `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`, `plpgsql`.
- **Sequence:** `analytics_events_id_seq` (bigserial).
- **pg_cron / Edge Function:** YOK. Zamanlanmış işler Vercel cron'da
  (`/api/sync` 09:00, `/api/analytics/rollup` 00:30).

## Kısıtlar

- **Benzersiz indeksler:** products (slug, trendyol_id, **trendyol_barcode**),
  orders (order_number), collections (slug), blog_posts (slug), campaigns (code),
  newsletter_subscribers (email), carrier_regions (provider+kind+provider_id),
  shipments (provider+provider_shipment_id), shipment_events (idempotency_key, kısmi),
  analytics_events (order_id, `event='purchase'` kısmi), wishlists (user+product, guest+product).
- **CHECK:** 15 adet (sipariş durumu, kargo durumu, analitik olay tipi, cinsiyet,
  materyal, rozet, kampanya tipi, yorum puanı 1–5 …).
- **Yabancı anahtarlar:** 14 adet; 7'si `auth.users`'a bağlı
  (orders, order_requests, user_profiles, user_addresses, user_billing, wishlists, reviews).

## RLS politikaları (15 adet)

| Tablo | Politika | Etki |
|---|---|---|
| campaigns | Anyone can read active campaigns | anon SELECT (is_active) |
| collections | Public read · Service write | anon SELECT (is_active) · service_role ALL |
| homepage_settings | Anyone can read homepage_settings | anon SELECT (tümü) |
| reviews | Anyone can read approved reviews | anon SELECT (is_approved) |
| orders | Users can view own orders · allow_insert_orders | sahibi/guest_email · INSERT açık |
| order_requests | Users can view own requests · Users can insert own requests | sahibi |
| user_profiles | view/insert/update own profile | sahibi |
| user_addresses / user_billing / wishlists | Users own … | sahibi (ALL) |

**Politikası olmayan tablolar** (yalnız service_role erişir): products, blog_posts,
site_content, sync_log, newsletter_subscribers, shipments, shipment_events,
carrier_regions, analytics_*, consent_logs.

## Storage

| Bucket | Public | Limit | İzinli tipler | Dosya | Boyut |
|---|---|---|---|---:|---:|
| `media` | **evet** | 10 MB | image/jpeg, image/png, image/webp | **1** | 287 KB |

Dosya: `2026-08-15/msum803y-fwkd9i.webp` (anasayfa hero görseli).

## Auth

| Kullanıcı | Oluşturma | Son giriş | Doğrulu |
|---|---|---|---|
| `bedirhanbolat.bb@gmail.com` | 4 Nis 2026 | 12 Ağu 2026 | ✓ |

- **Toplam 1 kullanıcı.** Parola hash'leri taşınamaz → yeni projede hesap
  yeniden oluşturulup şifre sıfırlama ile devralınır (bkz. 06-bb-adimlari Adım 3).
- **Admin panel girişi Supabase Auth'a BAĞLI DEĞİL** — `ADMIN_SECRET_TOKEN`
  çerezi ile korunuyor (`src/proxy.ts`). Taşımadan etkilenmez.

## Kod tabanında proje kimliğine bağlı yerler

| Yer | Nasıl bağlı | Taşımada ne olacak |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` (Vercel env) | doğrudan URL | **değişecek** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Vercel env) | anahtar | **değişecek** |
| `SUPABASE_SERVICE_ROLE_KEY` (Vercel env) | anahtar | **değişecek** |
| `next.config.ts` → `images.remotePatterns` | **sabit yazılı** `npvanotrzbqsnxvasmxm.supabase.co` | **kod değişikliği gerekiyor** |
| `src/lib/legal/cerezEnvanteri.ts` | URL'den türetiyor (`sb-<ref>-auth-token`) | kendiliğinden düzelir |
| `src/lib/supabase/{client,server,service}.ts` | env'den okur | kendiliğinden düzelir |
| `src/lib/trendyol/{sync,syncRun}.ts` | env'den okur | kendiliğinden düzelir |
| `src/app/auth/callback/route.ts` | env'den okur | kendiliğinden düzelir |

**Veride saklanan tam URL:** yalnız `homepage_settings` → `hero_slides` payload'ında
1 adet (`image_url`). Ürün görselleri Trendyol CDN'inden geldiği için etkilenmez;
blog kapakları ve koleksiyon görsellerinde Supabase URL'si yok.

**RSS/sitemap/feed:** Supabase alan adına bağlı değil (site alan adını kullanıyor).

## Kargonomi webhook'u

Kayıtlı adres `https://www.nbsteelora.com/api/webhooks/carrier/kargonomi` — **site
alan adına bağlı, Supabase proje kimliğine değil.** Taşımadan etkilenmez, yeniden
kayıt gerekmez.
