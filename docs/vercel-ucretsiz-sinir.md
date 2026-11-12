# Vercel ücretsiz sınırı — NB Steelora (12 Kasım 2026)

## Ne oldu

- 10 Kas: ortak Vercel hesabı (bedirhanbolatbb-hub; karpanel + nb-steelora +
  ormanin-bekcisi + tukettiniz) ücretsiz paketin aylık sunucu süresini aştı:
  30 günde 12 sa 13 dk "Fluid Active CPU" (sınır 4 sa; Vercel'in verdiği
  geçici 3 katıyla 12 sa). NB Steelora'nın payı **5 sa 43 dk** (152 bin
  çağrı), KarPanel 6 sa 30 dk. Hesap 12 Aralık'a kadar kilitlendi; kilit
  süreli, kullanım düşse de kalkmıyor. nbsteelora.com 10 Kas akşamı – 12 Kas
  09:05 arası (ara ara) kapalıydı.
- 12 Kas: proje **kendi ücretsiz hesabına** taşındı (Vercel'in proje taşıma
  isteğiyle; ortam değişkenleri, dağıtımlar ve alan adları birlikte geldi).
  BB ücretli pakete geçmiyor — "ücretsiz planın yettiği kadar".

| | |
|---|---|
| hesap | nbsteelora@gmail.com (kullanıcı `nbsteelora-4819`) |
| takım | `team_HVHATuAyHGEETqip9qnLcps7` (slug `nbsteelora`, Hobby) |
| proje | `prj_gIlYhSA6xacRGAf4AnlD7vcLpCz1` (değişmedi) |
| oturum | Claude uygulamasının içindeki tarayıcıda açık |

- Taşımada **GitHub bağlantısı düştü**. Yayın yalnız `.github/workflows/deploy.yml`
  ile (GitHub Actions): `VERCEL_TOKEN` yeni hesabın jetonu (BB girdi),
  `VERCEL_ORG_ID` yeni takım, `VERCEL_PROJECT_ID` aynı. Kural aynı: Vercel CLI
  yerelde asla çalıştırılmaz, dağıtımı push tetikler.
- Zamanlanmış işler (vercel.json) taşımadan sonra **kayıtsızdı**; aynı
  commit'in Git yapımı (`dpl_7s77DZJR8LvrmJ1KqSK1ag6fQRe4`) yayına alınınca 4
  iş kaydoldu. Yeni dağıtımlar zaten kaydeder.

## Sınır ve ölçüm

- Sınır: kayan **30 günde 4 saat** Fluid Active CPU. Aşılırsa site 30 gün
  kapanır. Hedef: **ayda 3 saatin altı**.
- Yeni hesapta ilk 80 dakika: 42 sn, 383 çağrı → bu hızla ayda ~6,3 saat.
- Ölçmek: `https://vercel.com/nbsteelora/~/usage` (proje süzgeci
  `?projectId=...`) ve son 12 saatlik yol kırılımı
  `https://vercel.com/nbsteelora/nb-steelora/observability/vercel-functions?period=12h`
  (Hobby'de en fazla 12 saat). İstek bazında kim çağırıyor: Logs → Request
  Logs, satıra tıkla → User Agent.
- Her gece 22.37'de "Vercel ücretsiz sınır kontrolü (günlük)" görevi iki
  hesabı ölçer, yalnız sınıra yaklaşınca BB'ye yazar.

## Bulunanlar (12 Kas, istek günlüğü + Observability)

1. **SentryUptimeBot ana sayfayı dakikada bir istiyor** (her dakikanın 40.
   saniyesi). Vitrin her istekte kurulduğu için ayda ~43 bin sayfa kurulumu.
2. **Ürün kartları görünür alana girince ürün sayfası arka planda kuruluyordu**
   (Next prefetch; `lib/analytics/server.ts`: "6 dakikada 68 ürün sayfası").
3. `/api/health` HEAD 5 dakikada bir (~81 ms) — ayda ~12 dk, kabul edilebilir.
4. Kök sebep: **vitrinin her sayfası dinamik** — `proxy.ts` istek başı nonce'lu
   CSP, `(store)/layout.tsx` sunucu `page_view` + `getSession`, ana sayfada
   `searchParams`. Hiçbir vitrin sayfası önbellekten verilemiyor.

## Yapılanlar

- `4cc9a8b`: izleyiciye ara katmanda kısa 200 (`proxy.ts`, `IZLEYICI`);
  ürün kartı `prefetch={false}` + imleç/parmak değince `router.prefetch`.

## Sıradaki (NB Steelora oturumunun işi)

24 saat sonra yeniden ölç. Öngörü 3 saati geçiyorsa:

- Vitrin sayfalarını önbelleğe alınabilir yap: `page_view`'i tarayıcıdan
  hafif bir çağrıya taşı (bot ve prefetch eleme kuralları aynı kalsın),
  oturuma bağlı arayüzü (hesap simgesi) istemciye al, ana sayfa önizlemesini
  istemciye al, CSP'yi herkese açık sayfalarda sabit politikaya çevir (nonce
  yalnız panel / hesabım / ödeme / sipariş-tamamlandı yollarında kalsın),
  sonra `/`, `/urun/[slug]`, `/kategori/[slug]`, `/blog/[slug]` için
  yeniden doğrulamalı önbellek.
- Sentry izleyicisinin aralığını 5 dakikaya çıkar ya da `/api/health`'e
  yönelt (Sentry paneli; BB oturumu gerekir).
