# Geri dönüş planı (rollback)

Taşıma sırasında sorun çıkarsa eski projeye dönüş **hızlı ve güvenlidir**, çünkü
taşıma boyunca eski projeye hiçbir yazma yapılmaz — kaynak proje dokunulmadan durur.

---

## Ne zaman geri dönülebilir?

| Aşama | Geri dönüş | Nasıl |
|---|---|---|
| Adım 1–7 (yeni proje kurulumu, veri kopyası, doğrulama) | **Risk yok** | Canlı site hâlâ eski projeye bağlı; hiçbir şey yapmaya gerek yok. Yeni projeyi silip baştan başlayabilirsiniz. |
| Adım 8 (env değişimi + redeploy) | **Güvenli** | Aşağıdaki 3 adımı uygulayın (~5 dk). |
| Adım 9 sonrası, yeni projede **yeni sipariş/kayıt oluştuktan sonra** | **Veri kaybı riski** | Geri dönerseniz yeni projede oluşan kayıtlar canlıda görünmez. Önce o kayıtları eski projeye taşıyın (03-data-kopyala.mjs'i ters yönde çalıştırarak: ESKI/YENI değişkenlerini yer değiştirin). |

---

## Geri dönüş adımları (Adım 8 sonrası)

1. **Vercel → Settings → Environment Variables** — üç değeri eski hâline alın:

| Env adı | Eski değer |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://npvanotrzbqsnxvasmxm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eski `anon` anahtarı |
| `SUPABASE_SERVICE_ROLE_KEY` | eski `service_role` anahtarı |

> Bu üç değeri taşımadan **önce** bir yere kaydedin. Vercel eski değerleri
> saklamaz; anahtarları eski Supabase projesinin Settings → API ekranından
> tekrar alabilirsiniz (proje silinmediyse).

2. **`next.config.ts`** — yeni alan adı eklendiyse geri alın (ya da ikisi birden
   listede kalabilir; zararsızdır).

3. **Redeploy** — Vercel → Deployments → son çalışan dağıtımda **Redeploy**
   ("Use existing build cache" kapalı).

✅ Kontrol: `/urunler` sayfasında 287 ÜRÜN; panel açılıyor; hero görseli görünüyor.

---

## Geri dönüş penceresi

- **Eski projeyi en az 1 hafta silmeyin.** Bu süre boyunca geri dönüş tek
  adımdır (env + redeploy).
- Eski proje silindikten sonra geri dönüş **mümkün değildir**; yalnız yeni
  projeden yedek alınarak yeni bir proje kurulabilir.
- Supabase ücretsiz planda 1 haftadan uzun kullanılmayan projeleri duraklatabilir;
  duraklatılmış proje geri açılabilir ama açılması birkaç dakika sürer.

---

## Kısmi sorunlar için hızlı çözümler

| Belirti | Olası neden | Çözüm |
|---|---|---|
| Ürünler görünmüyor, sayfa boş | Env değişkenleri eksik/yanlış | Vercel'de üç anahtarı kontrol edin, redeploy |
| Hero görseli kırık | Storage kopyalanmadı ya da URL güncellenmedi | `04-storage-kopyala.mjs` + hero URL güncelleme SQL'i |
| Görseller `/_next/image` 400 veriyor | `next.config.ts` remotePatterns'ta yeni alan adı yok | Yeni hostname'i ekleyip redeploy |
| Panel açılıyor ama ürün düzenleme 404 | Şema eksik (products sütunları) | `01-schema.sql`'i tekrar koşun (IF NOT EXISTS güvenli) |
| Şifre sıfırlama maili gelmiyor | SMTP ayarları yapılmadı | Adım 6'daki SMTP bölümü |
| "permission denied for table …" | 02-policies.sql koşulmadı | `02-policies.sql`'i koşun |
| Sipariş oluşuyor ama panelde görünmüyor | İki projeye birden yazılıyor (env yarım güncellenmiş) | Tüm env'lerin aynı projeyi gösterdiğini doğrulayın, redeploy |
