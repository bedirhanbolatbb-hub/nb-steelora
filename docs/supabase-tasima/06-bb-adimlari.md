# Supabase taşıma — BB'nin adım listesi

**Hedef:** proje Singapur'dan (ap-southeast-1) Frankfurt'a (eu-central-1) taşınır.
Supabase bölgeyi yerinde değiştirmediği için **yeni proje** kurulur, veri kopyalanır,
ortam değişkenleri değiştirilir.

**Toplam süre:** ~60–90 dk (hazırlık dahil) · **Sitenin kapalı kalacağı süre: ~5–10 dk**

> Sıra önemlidir. Her adımın sonundaki ✅ kontrolünü geçmeden ilerlemeyin.

---

## Adım 0 — Hazırlık (kesinti yok, ~10 dk)

1. Eski projenin **service_role** anahtarını hazır bulundurun:
   Supabase Dashboard → eski proje → Settings → API → `service_role` (secret).
2. Elinizde şu bilgiler olsun: Resend API anahtarı (SMTP için), admin panel parolası.
3. Terminalde repo klasörüne geçin (`nb-steelora`).

✅ Kontrol: `git pull` ile repo güncel; `docs/supabase-tasima/` klasörü görünüyor.

---

## Adım 1 — Yeni proje oluşturma (~5 dk)

Supabase Dashboard → **New project**

| Alan | Değer |
|---|---|
| Name | `nb-steelora-eu` (ya da tercih ettiğiniz ad) |
| Region | **Central EU (Frankfurt) — eu-central-1** |
| Database Password | Güçlü ve **yeni** bir parola (parola yöneticisine kaydedin) |
| Plan | Mevcut planla aynı |

Proje hazır olunca **Settings → API** ekranından şunları not edin:
- Project URL: `https://<yeni-ref>.supabase.co`
- `anon` (public) anahtarı
- `service_role` (secret) anahtarı

✅ Kontrol: proje durumu "Active/Healthy".

---

## Adım 2 — Şema ve politikalar (~5 dk)

Yeni projede **SQL Editor**'ü açın ve sırayla çalıştırın:

1. `docs/supabase-tasima/01-schema.sql` içeriğini yapıştırın → Run
2. `docs/supabase-tasima/02-policies.sql` içeriğini yapıştırın → Run

✅ Kontrol: hata yok; Table Editor'de 22 tablo ve `products_display` görünümü var.

---

## Adım 3 — Auth kullanıcısı (~5 dk)

**Parola hash'leri taşınamaz.** Sistemde tek kullanıcı var:

| E-posta | Oluşturma | Rol |
|---|---|---|
| `bedirhanbolat.bb@gmail.com` | 4 Nisan 2026 | Tek müşteri hesabı (test) |

Yeni projede: **Authentication → Users → Add user → Create new user**
- Email: `bedirhanbolat.bb@gmail.com`
- **Auto Confirm User: açık**
- Geçici bir parola verin (sonra "şifremi unuttum" ile değiştirebilirsiniz)

Kullanıcı oluşunca **UUID'sini kopyalayın**. Eski projedeki UUID:
`705221e6-4f47-45c0-8823-c8e2a0e1df62`

> ⚠️ Yeni UUID farklı olacak. Veri kopyası sırasında `user_id` alanları eski
> UUID'yi taşıdığı için **iki seçenek** var:
>
> **(a) Kolay yol (önerilen):** Kullanıcıya bağlı satırları taşımayın.
> Bunlar zaten test verisi: 11 sipariş, 1 profil, 1 adres, 1 fatura, 1 favori,
> 5 iade/iptal talebi. Adım 4'te `--only=` ile bunları hariç tutun.
>
> **(b) Birebir yol:** SQL Editor'de kullanıcının UUID'sini eski değere
> güncelleyin: `UPDATE auth.users SET id = '705221e6-4f47-45c0-8823-c8e2a0e1df62'
> WHERE email = 'bedirhanbolat.bb@gmail.com';` — sonra tüm tabloları taşıyın.

✅ Kontrol: Authentication → Users listesinde e-posta görünüyor.

**Panel girişi Supabase Auth'a bağlı DEĞİL:** admin paneli `ADMIN_SECRET_TOKEN`
çerezi ile korunuyor (`src/proxy.ts`). Taşımadan etkilenmez.

---

## Adım 4 — Veri kopyası (~10 dk)

Terminalde:

```bash
export ESKI_URL="https://npvanotrzbqsnxvasmxm.supabase.co"
export ESKI_KEY="<eski service_role>"
export YENI_URL="https://<yeni-ref>.supabase.co"
export YENI_KEY="<yeni service_role>"

# Önce kuru çalışma — sayıları görün, hiçbir şey yazılmaz
node docs/supabase-tasima/03-data-kopyala.mjs --dry

# Gerçek kopya (Adım 3'te (a) yolunu seçtiyseniz kullanıcıya bağlı tabloları atlayın)
node docs/supabase-tasima/03-data-kopyala.mjs --atla-analitik
```

Beklenen satırlar: products 520 · carrier_regions 312 · sync_log 187 ·
blog_posts 25 · site_content 36 · homepage_settings 13 · campaigns 3 · collections 3

✅ Kontrol: betiğin sonunda her tablo için "kaynak N → hedef N" eşit.

---

## Adım 5 — Storage (~5 dk)

```bash
node docs/supabase-tasima/04-storage-kopyala.mjs
```

Bu betik `media` bucket'ını **public** olarak oluşturur ve dosyaları aynı yolla
kopyalar. Şu an bucket'ta **1 dosya** var (`2026-08-15/msum803y-fwkd9i.webp`,
~287 KB — anasayfadaki hero görseli).

Sonra hero slaytındaki tam URL'yi yeni projeye çevirin (SQL Editor):

```sql
UPDATE public.homepage_settings
SET payload = replace(payload::text, 'npvanotrzbqsnxvasmxm.supabase.co', '<yeni-ref>.supabase.co')::jsonb
WHERE section = 'hero_slides' AND payload::text LIKE '%npvanotrzbqsnxvasmxm%';
```

✅ Kontrol: Storage → media → dosya görünüyor; public URL tarayıcıda açılıyor.

---

## Adım 6 — Auth ayarları (~10 dk)

**Authentication → URL Configuration**
- Site URL: `https://www.nbsteelora.com`
- Redirect URLs: `https://www.nbsteelora.com/auth/callback` ve `https://www.nbsteelora.com/**`

**Authentication → Emails → SMTP Settings** (Enable Custom SMTP açık)

| Alan | Değer |
|---|---|
| Sender email | `siparis@nbsteelora.com` |
| Sender name | `NB Steelora` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | *(Resend API anahtarı)* |

**Authentication → Emails → Templates**

| Sekme | Konu | Dosya |
|---|---|---|
| Reset Password | `Şifre Sıfırlama — NB Steelora` | [`auth-sablon-sifre-sifirlama.html`](./auth-sablon-sifre-sifirlama.html) |
| Confirm signup | `E-posta Adresinizi Doğrulayın — NB Steelora` | [`auth-sablon-eposta-dogrulama.html`](./auth-sablon-eposta-dogrulama.html) |

✅ Kontrol: ayarlar kaydedildi (test maili Adım 9'da).

---

## Adım 7 — Doğrulama (kesinti yok, ~5 dk)

Yeni projede SQL Editor → `docs/supabase-tasima/05-dogrulama.sql` → Run.
Beş bölümün de beklenen değerleri tutmalı; özellikle:
- Bölüm 3 (yabancı anahtar bütünlüğü): **hepsi 0**
- Bölüm 4 (eski proje kimliği kalıntısı): **hepsi 0**
- Bölüm 5: tüm tablolarda `rls_acik = true`

✅ Kontrol: sapma yoksa geçişe hazırsınız.

---

## Adım 8 — Geçiş (KESİNTİ BURADA: ~5–10 dk)

1. **Trendyol senkronunu durdurun** (cron 09:00'da çalışıyor; geçişi başka
   saatte yapın ya da Vercel → Settings → Cron Jobs'tan geçici kapatın).
2. Son **delta kopyası**: Adım 4'teki betiği tekrar çalıştırın (upsert olduğu
   için güvenli; yalnız değişenler yazılır).
3. **Vercel → Settings → Environment Variables** — üç değeri güncelleyin:

| Env adı | Yeni değer |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<yeni-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yeni `anon` anahtarı |
| `SUPABASE_SERVICE_ROLE_KEY` | yeni `service_role` anahtarı |

4. **`next.config.ts` güncellemesi gerekiyor:** görsel `remotePatterns` listesinde
   eski proje alan adı sabit yazılı. Yeni alan adını ekleyin (ya da bana söyleyin,
   tek satırlık değişikliği ben yaparım):
   ```ts
   { protocol: 'https', hostname: '<yeni-ref>.supabase.co', pathname: '/storage/v1/object/public/**' }
   ```
5. **Redeploy** (Vercel → Deployments → Redeploy, "Use existing build cache" KAPALI).

✅ Kontrol: dağıtım "Ready".

---

## Adım 9 — Geçiş sonrası doğrulama (~10 dk)

Sırayla kontrol edin:

- [ ] Anasayfa açılıyor, ürünler ve hero görseli görünüyor
- [ ] `/urunler` sayfasında **287 ÜRÜN** yazıyor
- [ ] Bir ürün sayfası açılıyor, görseller yükleniyor
- [ ] `/panel` girişi çalışıyor (admin parolası)
- [ ] Panel → Ürünler listesi dolu; bir ürünün düzenleme sayfası açılıyor
- [ ] Panel → Kürasyon: Öne Çıkanlar ve Yeni Gelenler listeleri duruyor
- [ ] Panel → Site Metinleri: künye alanları dolu
- [ ] Çerez bandı çıkıyor; "Kabul et" → `/cerez-politikasi` sayfası açılıyor
- [ ] `/kargo-takip` sayfası açılıyor
- [ ] **Şifre sıfırlama testi:** `/sifremi-unuttum` → mail geliyor mu, gönderen
      `NB Steelora <siparis@nbsteelora.com>` mi, bağlantı çalışıyor mu
- [ ] Panel → Senkron: "Şimdi çalıştır" ile bir senkron koşusu başarılı mı

✅ Hepsi geçtiyse taşıma tamamdır.

---

## Adım 10 — Temizlik (geçişten SONRA, en erken 1 hafta)

- Yeni projede test siparişlerini/analitik kayıtlarını temizleyin (isterseniz).
- Eski Supabase projesini **hemen silmeyin**; en az 1 hafta bekleyin
  (geri dönüş penceresi — bkz. `07-geri-donus.md`).
- Eski proje silinince `next.config.ts`'ten eski `remotePatterns` satırı kaldırılabilir.
- KVKK metnindeki aktarım tablosunda Supabase satırı **"Frankfurt (Almanya, AB)"**
  olarak güncellenmeli — bunu bana söyleyin, tek dosyada yaparım.
