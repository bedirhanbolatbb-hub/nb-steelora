# Vercel ücretsiz sınırı — NB Steelora (12 Kasım 2026)

## Devir notu (13 Kas 2026) — açık kalanlar

KarPanel sohbetinin 13 Kas devrinden (BB: "NB Steelora'yı karıştırma, işlerini
nbsteelora sohbetine devret") ölçüm kısmı aşağıya işlendi. Açık kalanlar:

1. Tosla kartla ödeme (nbsteelora.com): kod `tosla-odeme` dalında (1fcd5a5),
   main'e birleştirilmedi; kart anahtarı kapalıyken site bugünkü gibi çalışır.
   Plan ve canlıya alma adımları: `git show tosla-odeme:docs/tosla/PLAN.md`.
   Canlıya alma BB'nin kararı.
2. Tosla yazışması: cevap geldi (13 Kas) — nbsteelora.com için Tosla İşim
   panelinden AYRI Sanal POS başvurusu. 13 Kas'ta gönderildi ("Başvurunu
   aldık"): tek çekim komisyon %1,99, ödeme 7 gün sonra, aylık ciro 25.000 TL,
   sektör Giyim ve Aksesuar. Taksit oranları yüksek (2 taksit %6,35 … 12 taksit
   %25,04) → açılışta yalnız tek çekim.
3. Tosla'nın eksik bildirimi ("iletişim adres bilgisi ile VISA, MASTERCARD ve
   TROY logoları eklenmelidir") 13 Kas 17.50'de giderildi: main 68cb920
   (GitHub sitesinden PR #1, bilgisayar köprüsü kesikken BB'nin açık onayıyla;
   Deploy #346). Logolar `public/badges/`, bileşen
   `src/components/store/OdemeLogolari.tsx` (TOSLA_ODEME_ACIK=evet olunca alt
   satır kendiliğinden değişir), İletişim + sayfa altı açık adres/telefon
   künyeden, kargo-ve-iade'de "Sipariş İptali". BB Tosla'ya "tamamlandı"
   yazacak. YEREL DEPO bu sırada geride kaldı (yerelde 3138ba1 + bu belge
   commit'i) → sonraki VS Code eşitlemesi önce çeker, sonra gönderir.
4. Sırada: Tosla onayı → bağlantı bilgileri panelde İşyeri Bilgileri → API
   Bilgileri → "SMS ile gönder" ile BB'nin telefonuna → BB Vercel'e girer →
   `tosla-odeme` birleştirilir (Footer Alt Şerit, kargo-ve-iade ve gizlilik
   metniyle çakışmaya bak; kart logosu/ödeme metni varsa OdemeLogolari ile tek
   kaynakta birleştir; sözleşme sürüm tarihleri) → kart kapalıyken canlı
   kontrol → TOSLA_ODEME_ACIK=evet → küçük gerçek alışveriş + panelden iptal.

(KarPanel sohbetindeki "NB Steelora N11'de mağaza açsın" önerisi geçersizdi:
BB N11'i KarPanel için sormuş.)

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
- **Doğru ölçüm Usage'dan** (13 Kas'ta anlaşıldı): Observability'deki yol
  tablosu yalnız sayfa/uç işlevlerini gösterir, ara katmanı (proxy.ts)
  GÖSTERMEZ. Usage → Fluid Active CPU → tarih kutusuna `12 hours` yaz →
  "Type" sekmesi: `function` ve `middleware` ayrı ayrı. Günlük çubuklar UTC
  gününe göredir (13 Kas çubuğu TR 03.00'te başlar); saatlik görünüm TR saati.
- 13 Kas ölçümü: KarPanel 09.45'te yol tablosundan 1 dk 43 sn okumuştu (yalnız
  işlevler). 11.50, Usage, son ~12 sa: **toplam 4 dk 14 sn = işlev 2 dk 24 sn
  (%57) + ara katman 1 dk 50 sn (%43)** → aylık öngörü **~4 sa** (sınırın
  kendisi). Hesap toplamı (12 Kas'tan beri) 12 dk 48 sn: 12 Kas (UTC) 9 dk
  59 sn — taşıma sonrası ilk saatler ve yayınlar —, 13 Kas (UTC) 2 dk 49 sn.
  Yol tablosu (12 sa, işlevler): `/urun/[slug]` 252 çağrı 48 sn, `/` 166 /
  33 sn, `/api/health` 149 / 12 sn, `/api/gorsel/kadraj` 12 / 8 sn,
  `/kategori/[slug]` 37 / 2,4 sn; ara katman 1,3 bin çağrı (respond 758,
  next 573), çağrı başına ortalama ~85 ms.
- Günlük kontrol: KarPanel'in 22.37 görevinden NB Steelora çıkarıldı (13 Kas);
  NB Steelora ölçümü bu sohbetin zamanlanmış görevleriyle yapılır.
- 14 Kas 00.40 TR ölçümü (son 12 saat, 12.40–00.40): Fluid Active CPU 8 dk 50 sn = function 7 dk 03 sn + middleware 1 dk 47 sn → ham öngörü ×60 ≈ 8,8 sa/ay. Pencerede üç yayın var (bc72a23 12.19, 68cb920 ~17.50, 921aa2f ~22.55); yayın saatlerinin çubukları (13:00, 17:00–18:00, 22:00) saat başı ~1–1,5 dk. Yayınsız saatler ~22 sn/sa → ~4,4 sa/ay (gündüz ağırlıklı pencere). 19:00–23:00 dört saat: function 2 dk 17 sn + middleware 36 sn. Middleware 12 sa: next 888 · respond 19 · rewrite 1 (taban 1,3 bin, respond 758) → izleyici yoklaması statiğe geçmiş. Sonuç: 4 saatlik sınırın üstü; vitrin önbelleği (ISR) kararı BB'de bekliyor, hatırlatıldı. Yayın sayısını azalt: belge commit'leri biriktirilsin.

## Bulunanlar (12 Kas, istek günlüğü + Observability)

1. **SentryUptimeBot ana sayfayı dakikada bir istiyor** (her dakikanın 40.
   saniyesi). Vitrin her istekte kurulduğu için ayda ~43 bin sayfa kurulumu.
2. **Ürün kartları görünür alana girince ürün sayfası arka planda kuruluyordu**
   (Next prefetch; `lib/analytics/server.ts`: "6 dakikada 68 ürün sayfası").
3. `/api/health` HEAD 5 dakikada bir (~81 ms) — ayda ~12 dk, kabul edilebilir.
4. Kök sebep: **vitrinin her sayfası dinamik** — `proxy.ts` istek başı nonce'lu
   CSP, `(store)/layout.tsx` sunucu `page_view` + `getSession`, ana sayfada
   `searchParams`. Hiçbir vitrin sayfası önbellekten verilemiyor.
5. **Üst menü / alt bilgi bağlantıları her sayfa açılışında arka planda sayfa
   kuruyor** (12 Kas 09:55 UTC, istek günlüğü, tek ana sayfa açılışı, aynı
   saniye içinde `isPrefetchRequest`): `/odeme` ×2, `/urunler` ×2, `/` ×1 ve
   bir ürün (`…-NBH008`) ×2. Sayfalar dinamik olduğu için her biri tam sunucu
   kurulumu. Ürün kartı dışındaki bir bileşen de ürün önyüklüyor — hangisi
   olduğunu bul.
6. **`/api/gorsel/kadraj` ikinci büyük kalem**: Observability 12 saat →
   198 çağrı, ~1 dk işlemci (`/` 584 çağrı ~1 dk, `/urun/[slug]` 138 / 12 sn,
   `/api/health` 111 / 10 sn, `/kategori/[slug]` 120 / 3,6 sn). Gelenler
   gerçek ziyaretçi (Facebook/Instagram reklamı, `fbclid`). Yanıt zaten
   `s-maxage=1 yıl, immutable` ve 5 sabit genişlik; yine de 50 örnekten 17'si
   önbellekte yok, her biri 0,4–1,4 sn. 50 örneğin hepsi 10:58 yayınından
   sonra → muhtemel sebep: her yayında uç önbellek sıfırlanıyor ve tüm
   görseller yeniden üretiliyor. Doğrula; doğruysa üretilen görseli kalıcı bir
   depoya yazıp oradan ver (yayından etkilenmesin) ve gereksiz yayından kaçın.

7. **Ara katman sunucu süresinin %43'ü** (13 Kas, Usage → Type). 12 saatte
   ~1,3 bin çağrı; "respond" 758'in ~720'si izleyicinin kökteki dakikalık
   yoklaması (kısa 200 bile bir çağrı), "next" 573 sayfa ve önyükleme.
   Çağrı başına ~85 ms: işleyicinin kendisi hafif, maliyet çağrı sayısında.

8. **`/favicon.ico` 404 → 404 sayfası her seferinde sunucuda kuruluyor**
   (13 Kas istek günlüğü; `not-found.tsx` force-dynamic). Site simgesi
   `/icon` (icon.tsx); tarayıcılar yine de `/favicon.ico` istiyor. 12 sa'te
   `/_not-found` 11 çağrı / 0,7 sn — küçük ama bedava kapatılabilir
   (public/favicon.ico).
9. **Kadraj önbelleği her yayında sıfırlanıyor — doğrulandı** (13 Kas, yayından
   hemen sonra): ana sayfadaki 12 kadraj görselinin 12'si `MISS · age 0`,
   aynı adres ikinci istekte `HIT`. Yani her yayın, ziyaret edilen her görsel
   için bir kez yeniden üretim (0,4–1,4 sn) demek: yalnız belge değişen
   commit de yayın tetikliyor.

## Yapılanlar

- `4cc9a8b`: izleyiciye ara katmanda kısa 200 (`proxy.ts`, `IZLEYICI`);
  ürün kartı `prefetch={false}` + imleç/parmak değince `router.prefetch`.
- Canlı doğrulama (12 Kas, `dpl_4tEdqn`, 61ef0af, 10:58 TR yayını):
  SentryUptimeBot istekleri yalnız ara katmanda ~20 ms, sayfa kurulmuyor;
  ana sayfa, ürün sayfası, `/api/health` 200. Gündüz yayınına rağmen
  12:00 TR `/api/sync` çalıştı (zamanlanmış görevler yeni yayına bağlandı).

- 13 Kas, `bc72a23` (yayın `dpl_53ZkXqa5snt6qh1whiEwhgtTgUrW`, 12.19 TR):
  - İzleyicinin kökteki yoklaması **ara katmana hiç girmiyor**: next.config.ts
    `rewrites.beforeFiles` onu statik `/izleyici.txt`'ye ("ok") yönlendiriyor,
    proxy.ts matcher'ı kökü YALNIZ bu tarayıcıya karşı atlıyor (kök dışındaki
    hiçbir yolda koşul yok; o adla gelen istek kökte sayfa değil düz metin
    alır). Matcher Next'in kendi eşleyicisiyle sınandı: `/` tarayıcı → ara
    katman, `/` izleyici → atlanır, `/urun/x`, `/odeme`, `/panel`, `/hesabim`
    izleyici adıyla bile → ara katman.
  - Vitrin `<Link>`'lerinde kendiliğinden önyükleme kapalı: 40 dosyada 96
    bağlantıya `prefetch={false}` (sayfalar dinamik; her önyükleme bir sunucu
    çağrısı + ara katman). Ürün kartı imleç/dokunuşta önyüklemeye devam eder.
    **ESLint kuralı** (`eslint.config.mjs`, `no-restricted-syntax`): vitrin
    kodunda `prefetch`'i belirtilmemiş `<Link>` hata verir — yeni bağlantıda
    unutulmaz.
  - Güvenlik başlıkları DEĞİŞMEDİ: bütün sayfalarda nonce'lu CSP sürüyor.
- Canlı doğrulama (13 Kas 12.20–12.30 TR): CDN günlüğünde izleyicinin
  12.19.40'tan sonraki her yoklaması `Route /izleyici.txt · Path Type static ·
  Cache HIT · 200`; istek günlüğünde kökte dakikalık ara katman satırı
  kesildi. Ana sayfa, `/odeme`, `/panel/login` nonce'lu CSP + strict-dynamic,
  `unsafe-inline` yok; `/odeme` no-store + noindex; `/panel` oturumsuz
  `/panel/login`'e gidiyor. Ana sayfa (masaüstünde 12 görünür menü
  bağlantısı) ve ürün sayfası açılışında RSC önyükleme isteği 0. 390 px ürün
  sayfası taşma yok; sepet paneli → "Ödemeye Geç" → `/odeme` ve menü →
  `/kategori/kolye` gezinmesi çalışıyor; konsolda hata yok.

## Sıradaki (NB Steelora oturumunun işi)

- Yayından ~12 saat sonra Usage'tan yeniden ölç (Type kırılımıyla). Hedef
  ayda 3 saatin altı.
- **Vitrin önbelleği (ISR) — YAPILDI (14 Kas 2026, BB onayı "onaylıyorum yap").**
  `/`, `/urun/[slug]`, `/blog/[slug]` önbellekten (revalidate 3600 +
  `generateStaticParams() → []`); nonce'suz sabit CSP vitrinde next.config.ts'ten
  (`cspSabit`), nonce'lu sıkı CSP yalnız panel/hesabım/ödeme/sipariş/giriş/kayıt/
  şifre yollarında (proxy.ts; layout'larında `force-dynamic`). Proxy matcher
  daraltıldı: vitrin isteklerinde middleware hiç çalışmaz (`/?utm_source=instagram`
  hariç). Ölçüm tarayıcıya taşındı: `SayfaGoruntuleme` (page_view, meta.kaynak=
  istemci; track ucu bunu kabul eder, `kaynak` kayda yazılmaz), product_view
  `RecentlyViewedTracker`'dan. Hesap simgesi `useOturumVar` (çerez varlığı).
  Ürün fiyat bloğu `UrunFiyati`, tahmini teslim `TahminiTeslim` istemcide;
  `KampanyaSaglayici` bitiş anında indirimi düşürür. Katalog okumaları
  `createPublicClient` (çerezsiz). Ana sayfa önizlemesi `/onizleme?kampanya=`
  (panel bağlantısı güncellendi). Panel kayıt uçları ve `/api/sync`
  `after(vitriniYenile)` ile `revalidatePath('/', 'layout')` çağırır.
  `/kategori` ve `/urunler` süzgeçleri sunucuda olduğu için dinamik kalır.
  Yayından sonra: x-vercel-cache HIT, CSP başlıkları, panel/hesabım nonce'u,
  fiyat ve 390 px kontrolü; 24 saat sonra Usage ölçümü.
- Sentry izleyicisinin aralığını 5 dakikaya çıkar (Sentry paneli; BB oturumu
  gerekir). Artık sunucu süresi harcamıyor; yalnız gereksiz istek.
- Gereksiz yayından kaçın: yalnız `docs/` ve `.md` değişen commit'ler
  yayınlanmasın (`deploy.yml` → `paths-ignore`), her yayın kadraj görsellerini
  yeniden ürettiriyor (bulgu 9). Bir sonraki kod yayınıyla birlikte.
- `public/favicon.ico` (bulgu 8) ve kadraj görsellerini kalıcı depoya yazma
  (bulgu 6/9) — bir sonraki kod yayınıyla.


## 15 Kasım 2026 ölçümü — vitrin önbelleğinden (ISR) 24 saat sonra

Kaynak: nbsteelora takımı → Usage → Fluid Active CPU (Projects görünümü, saat
aralıkları Türkiye saati). Bu hesap 12 Kasım'da açıldı; 30 günlük toplam şu an
36 dk 49 sn (12 Kas ~10 dk, 13 Kas ~13 dk, 14 Kas ~11 dk, 15 Kas sabahı).

| Aralık | Fluid Active CPU |
| --- | --- |
| ISR'den önceki 24 saat (13 Kas 10.16 → 14 Kas 10.16) | 13 dk 45 sn |
| ISR'den sonraki 24 saat (14 Kas 10.16 → 15 Kas 10.16; gün içinde 5 yayın) | 11 dk 39 sn |
| 13 Kas (TR günü) | 13 dk 14 sn |
| 14 Kas (TR günü) | 11 dk 4 sn |
| Son 12 saat (15 Kas 00.53 → 13.00, yayın yok) | 3 dk 41 sn |

Tür kırılımı (ISR sonrası 24 saat): işlev %97,1 · ara katman %2,9 (ISR öncesi ara
katman ~%43'tü — matcher daraltması işe yaradı). Bölge: fra1 %99,6.

Öngörü: yayınsız gece temposu 3 dk 41 sn / 12 sa → günde ~7–9 dk → 30 günde
~3,5–4,5 sa: SINIRDA. Yayınlı gün ~11–12 dk. Bu tempoyla 4 saat 2–3 Aralık
civarında dolabilir.

Observability (son 12 sa, yol bazında, Usage'ın altında gösterir ama oranlar
doğru): `/urun/[slug]` 316 çağrı 59 sn · `/api/gorsel/kadraj` 121 çağrı 38 sn ·
`/api/health` 152 çağrı 12 sn · `/blog/[slug]` 36 çağrı 7 sn · `/` 6 sn ·
`/kategori/[slug]` 5 sn · `/urunler` 4,9 sn · geri kalanı küçük.
ISR (son 12 sa): `/urun/[slug]` okuma 125, yazma 632, tekil yol 227; süreye bağlı
yenileme 134; etiketle yenileme 0. Yani ürün sayfalarına gelen isteklerin çoğu
(büyük kısmı arama motoru botları) önbellekten değil yeniden üretimden
karşılanıyor: `revalidate = 3600` botların sayfaları saatten seyrek ziyaret
etmesi yüzünden neredeyse her ziyarette yeniden üretim demek.

Yapılacak (öncelik sırasıyla):
1. `/urun/[slug]` ve `/blog/[slug]` için `revalidate` 3600 → 86400. Fiyat bloğu
   (`UrunFiyati`) ve tahmini teslim istemcide; panel kayıtları ve `/api/sync`
   zaten `revalidatePath('/', 'layout')` çağırıyor — içerik değişince sayfa yine
   hemen tazelenir. Önce stok/tükendi gösteriminin sunucuda mı istemcide mi
   olduğunu doğrula.
2. Kadraj görselleri kalıcı depoya (bulgu 6/9): her yayında yeniden üretilmesin.
3. Yalnız `docs/` ve `.md` değişen commit'ler yayınlanmasın (`deploy.yml` →
   `paths-ignore`).
4. `/api/health` dakikada bir yoklanıyor gibi (12 saatte 152): çağıranı bul; dış
   izleyiciyse statik dosyaya yönlendir.

### 15 Kasım 2026 — uygulanan (yukarıdaki dört madde + bulunan bir açık)

1. **Ürün ve blog sayfası 24 saat** (`revalidate` 86400; ana sayfa 1 saatte
   kaldı). Doğrulandı: stok ("Son 1 adet", sepete ekle) sunucuda basılıyor;
   stok veritabanında yalnız senkron, panel ve sipariş/iptal/iadede değişiyor.
   Üçü de artık önbelleği hemen tazeliyor: senkron ve panel zaten
   `vitriniYenile` çağırıyordu, stok değişimi `lib/trendyol/stockUpdate`'e
   eklendi. Kampanyalar saatle başlayıp bittiği için yeni gece cron'u
   `/api/cron/vitrin-tazele` (21.05 UTC = 00.05 TR) önbelleği her gece
   tazeliyor; sayfadaki indirimli fiyat ve yapısal veri günü aşmaz.
2. **Açık kapatıldı:** panel uçlarında (17 çağrı) ve `/api/sync`'te
   `after(vitriniYenile)` yetki kontrolünden ÖNCE kayıtlıydı — kimliksiz bir
   POST bile bütün vitrin önbelleğini boşaltıp sayfaları yeniden ürettirebiliyordu
   (sunucu süresi harcatma yolu). Artık yalnız yetkili istekte; senkronda
   yalnız gerçekten koşan senkronun sonunda (durum okuması ve atlanan koşu
   boşaltmaz).
3. **Kadraj kalıcı depoda:** üretilen görsel Supabase `media` kovasına
   (`kadraj/v<KADRAJ_SURUM>/<sha256>-<en>-<oran>.webp`) yanıttan sonra yazılıyor;
   sonraki isteklerde uç üretmiyor, depodaki dosyaya 302 ile yönlendiriyor
   (yönlendirme uç önbelleğinde bir yıl / sonraki yayına kadar, tarayıcıda bir
   gün). Yayın sonrası her görsel için bir hafif yönlendirme kalıyor, işleme yok.
4. **Belge commit'i yayınlamaz:** `deploy.yml` → `paths-ignore: docs/**, **/*.md`.
5. **`/api/health`:** çağıran 5 dakikada bir yoklayan dış izleyici (asıl
   uygulama sağlığı için kasıtlı; kökteki Sentry yoklaması zaten statik
   `/izleyici.txt`'de). Statiğe almak veritabanı kesintisini görünmez yapacağı
   için seçilmedi: sağlıklı yanıt CDN'de 15 dk tutuluyor (`s-maxage=900`),
   işlev saatte en fazla ~4 kez çalışıyor; 503 hiç saklanmıyor.

Beklenen: `/urun/[slug]` yeniden üretimi ~20 kat azalır, kadraj işlemesi yayın
başına bir kez → ~0, health ~%70 azalır. Ölçüm: 24 saat sonra Usage → Fluid
Active CPU (hedef günde 5 dk altı).

### 16 Kasım 2026 ölçümü — d008486'dan ~25 saat sonra

Ölçüm 16 Kas 18.45 TR, Observability → Functions, son 12 saat (06.45–18.45 TR).
Usage grafiği gizli tarayıcı penceresinde çizilmediği için toplam yol tablosundan
toplandı; ara katman (middleware) 12 saatte 17 çağrı, ihmal edilebilir.

| Yol | Çağrı | Active CPU | Önceki 12 sa (15 Kas) |
|---|---|---|---|
| `/api/gorsel/kadraj` | 885 | ~4 dk | 121 · 38 sn |
| `/urun/[slug]` | 220 | 47 sn | 316 · 59 sn |
| `/api/health` | 70 | 15 sn | 152 · 12 sn |
| `/kategori/[slug]` | 36 | 7 sn | — |
| `/urunler` | 35 | 6 sn | — |
| `/` | 13 | 6 sn | — |
| `/api/analytics/track` | 43 | 5 sn | — |
| diğer 30 yol | ~70 | ~25 sn | — |
| **Toplam** | ~1.400 | **~5 dk 45 sn** | 3 dk 41 sn |

Kadraj dışı toplam ~1 dk 45 sn / 12 sa → günde ~3,5 dk: hedefin (günde 5 dk)
altında. Fazlalığın tamamı kadraj: uç 12 saatte Trendyol CDN'inden 591 görsel
indirdi (= 591 üretim), 294 istek depodan yönlendirildi. Neden: kalıcı depo
(`kadraj/v2/`) 15 Kas 17.30'da boş başladı; vitrindeki her (görsel × en × oran)
bir kez üretilip depoya yazılıyor. Depo yazımı çalışıyor: /urunler ilk
sayfasındaki 24 ürünün 5 enindeki 60 dosyanın 60'ı da depoda (HEAD 200).
Üretim sayısı katalogla sınırlı (yalnız kendi ürün görsellerimiz, 5 en,
3 oran) → tahminen 2.000–4.000 dosya, bir kerelik ~15–25 dk; dolunca uç yalnız
hafif yönlendirme yapar. Kod değişikliği YAPILMADI (yayın, uç önbelleğini
sıfırlayıp yönlendirmeleri yeniden çalıştırırdı). 30 günlük öngörü: dolum dahil
~2,5–3 sa (sınır 4 sa). Yeniden ölçüm 18 Kas akşamı (son 12 sa): kadraj
üretimi (cdn.dsmcdn.com çağrısı) 50'nin altına inmeli; inmezse aynı görselin
neden yeniden üretildiğine bak (depo yolu, oran/genişlik dağılımı, hız sınırı).

### 18 Kasım 2026 ölçümü — kadraj deposu doldu

Ölçüm 18 Kas 18.55 TR, Observability → Functions, son 12 saat (06.51–18.51 TR);
yol tablosunun iki sayfası (51 yol) toplandı. External APIs sayfası bu kez
çizildi (16 Kas'ta gizli pencerede boş kalmıştı).

| Yol | Çağrı | Active CPU | 16 Kas (12 sa) |
|---|---|---|---|
| `/urun/[slug]` | 172 | 41 sn | 220 · 47 sn |
| `/api/gorsel/kadraj` | 76 | 27 sn | 885 · ~4 dk |
| `/api/health` | 77 | 16 sn | 70 · 15 sn |
| `/urunler` | 25 | 8 sn | 35 · 6 sn |
| `/` | 15 | 7 sn | 13 · 6 sn |
| `/blog/[slug]` | 16 | 4,3 sn | — |
| `/api/fatura` (cron) | 3 | 4,2 sn | — |
| `/kategori/[slug]` | 10 | 3,6 sn | 36 · 7 sn |
| `/panel/siparisler` | 44 | 3,3 sn | — |
| `/sitemap.xml` | 13 | 3,0 sn | — |
| `/api/analytics/track` | 19 | 2,9 sn | 43 · 5 sn |
| diğer 40 yol | 523 | ~24 sn | ~25 sn |
| **Toplam** | 993 (üst özet: 940) | **~2 dk 25 sn** | ~5 dk 45 sn |

- **Kadraj:** External APIs → `cdn.dsmcdn.com` 12 saatte **2 çağrı** (16 Kas:
  591) = 2 üretim; kalan 74 istek depodan 302. Hedef (50 altı) tuttu, depo
  doldu. İstek başına ortalama ~0,35 sn Active CPU = 2 üretim (sharp, tam boy
  kaynak) + soğuk başlangıçlar (%27,8); yönlendirme yolunda sharp yüklenmiyor
  (`await import('sharp')` yalnız üretimde).
- **Toplam:** ~2 dk 25 sn / 12 sa (16 Kas'a göre −%58). Ölçülen 12 saat günün
  yoğun yarısı; ×2 üst sınırla günde ~4 dk 50 sn → hedef (günde 5 dk altı)
  tuttu. Panel yolları (`/panel*`) 511 çağrı · ~15 sn.
- **Usage, 19 Eki–18 Kas penceresi:** Fluid Active CPU **1 sa 10 dk / 4 sa**
  (%29; 15–16 Kas depo dolumu dahil), işlev çağrısı 20K, CDN isteği 32K, ISR
  yazma 19K, Fast Data Transfer 421,88 MB / 100 GB, Fast Origin Transfer
  481,92 MB / 10 GB, cron çağrısı 33.
- **Yan bulgu — dış çağrılar (12 sa):** Supabase 3,6K, `api.resend.com` 87,
  `app.kargonomi.com.tr` 86, `earsivportal.efatura.gov.tr` 71,
  `apigw.trendyol.com` 31, Vercel Data Cache 4, `cdn.dsmcdn.com` 2,
  `api.indexnow.org` 1. Resend ve Kargonomi çağrılarının 77'şer tanesi
  `/api/health`'in her yoklamada yaptığı anahtar/kredi kontrolü
  (`GET /domains`, `GET /api/v1/user/credit`). Kod toplu gönderim kullanmıyor
  (`resend.emails.send`, istek başına bir mail) → 12 saatte gerçek mail
  gönderimi + durum okuması en fazla 10; müşteriye fazla mail üreten bir döngü
  yok. Hostname ayrıntı sayfası (uç başına kırılım) Hobby'de örnek veri
  gösteriyor, kullanılamaz.

Karar: kod değişikliği yok. Kadraj artık yalnız yeni ürün görseli eklendiğinde
üretiyor. Dikkat: `KADRAJ_SURUM` artırılırsa depo yeni klasörde baştan dolar
(16 Kas'taki gibi bir kerelik ~15–25 dk) — sürüm yalnız kesim hesabı gerçekten
değişince artırılmalı, ardından 12 saatlik ölçüm. Bunun dışında yeniden ölçüm
yalnız Vercel sınır uyarısı gelirse.


## 24 Kasım 2026 — tarayıcı sayacı: ara katman tarayıcı adlı isteklere açıldı

Amaç: ChatGPT, Perplexity, Claude gibi asistanların ve arama motorlarının
tarayıcıları siteyi okuyor mu, hangi sayfaları — ölçmek (BB 23 Kas: yapay
zekâ görünürlüğü). Vitrin önbellekten verildiği için sunucu kodu bu istekleri
görmüyordu.

- `src/proxy.ts` eşleştiricisine tek satır eklendi: sayfa istekleri (betik,
  biçem, görsel ve `/api` hariç) **yalnız kullanıcı aracısı listedeki bir
  tarayıcı adını taşıyorsa** ara katmana gelir. İnsan ziyaretçinin vitrin
  isteği yine ara katmana uğramaz — Next'in kendi eşleyicisiyle sınanıyor
  (`src/lib/izleme/__testler__/istekKatmani.test.mts`: Chrome ve iPhone ile
  ana sayfa, ürün, koleksiyon, blog → eşleşmez).
- Ara katman bu isteklerde yalnız sayar ve isteği dokunmadan geçirir (nonce
  yok, sayfa önbellekten). Yazım `waitUntil` ile, tek REST çağrısı
  (`tarayici_ziyareti_yaz`); supabase-js ara katmana alınmadı.
- Liste: `src/lib/izleme/tarayicilar.ts` (67 ad; kaynak ai.robots.txt, MIT).
  Tablo ve fonksiyon: `docs/izleme/02-tarayici-ziyaretleri.sql`.
- Canlıda ayırt etme: yanıtta `x-nb-tarayici` başlığı yalnız bu isteklerde
  bulunur. Sıradan tarayıcıyla açılan vitrin sayfasında bu başlık YOKSA ara
  katman o istekte çalışmamıştır.
- Beklenen yük: tarayıcı isteği başına birkaç milisaniye. Kontrol yeri aynı:
  Usage → Fluid Active CPU → `12 hours` → "Type" sekmesinde `middleware`.
  Bu satır belirgin büyürse (günde birkaç dakikayı aşarsa) ilk adım
  eşleştiriciden klasik arama motorlarını (Googlebot, bingbot, YandexBot,
  DuckDuckBot) çıkarmak: listede `grup: 'arama'` olan dört satır silinir,
  test olması gereken kalıbı yazdırır.


## 25–26 Kasım 2026 — ikinci tur: sunucu süresi alarmı

Ölçüm (25 Kas, Usage → Fluid Active CPU): 30 günlük pencerede **2 sa 17 dk /
4 sa** (18 Kas'ta 1 sa 10 dk). Gidişle sınır 8–12 Aralık arasında aşılıyordu
(10 Kas'ta site bu yüzden kapanmıştı). 12 Kasım'ın kullanımı 13 Aralık'ta
pencereden düşer; o güne kadar kalan pay ~103 dk (günde ~5,9 dk, yayınlar ve
panel kontrolleri dahil).

Son 12 saat: işlev 5 dk 25 sn + ara katman 1 dk 01 sn. Sakin saatlerde işlev
~12 sn/sa, ara katman ~4,7 sn/sa (12 saatte 340 çağrı). **24 Kas'taki "tarayıcı
isteği başına birkaç milisaniye" beklentisi yanlıştı:** ara katman çağrı
başına ~0,18 sn Active CPU harcıyor (soğuk açılış). İlk 16 saatin 400 tarayıcı
isteğinin 44'ü asistan, 201'i eğitim (GPTBot 109, PetalBot 66, Bytespider 25),
155'i arama motoruydu (Googlebot 140). Ayrıca ölçüm turlarım (43 + 279 sayfa)
tek başına ~2,5 dk yedi.

Yapılanlar (tek yayın):

- **Tarayıcı sayacı yalnız asistanları sayar** (`SAYILAN_GRUPLAR`,
  `src/lib/izleme/tarayicilar.ts`). Eşleştirici kalıbı yalnız asistan adlarını
  taşır; eğitim ve arama tarayıcılarının vitrin isteği ara katmana hiç gelmez.
  Kapılı yollarda (panel, ödeme…) katman herkes için çalışır ama sayım yine
  yalnız asistan için (`sayilirMi`). Panel kartı eski kayıtları "25 Kas
  2026'dan beri sayılmıyor" notuyla gösterir. Beklenen: −~95 sn/gün.
- **`/api/health` uç önbelleği 15 dk → 60 dk** (her çağrı Kargonomi ve
  Resend'e de gidiyor). Beklenen: −~24 sn/gün.
- **Senkron vitrin önbelleğini yalnız görünen bir şey değiştiyse tazeler**
  (`src/lib/trendyol/vitrinFarki.ts`). Yazmadan önce yük veritabanıyla alan
  alan karşılaştırılır (defter damgaları hariç, beyaz liste yok); yeni ürün,
  pasife çekilen ürün, okunamayan karşılaştırma, düşen toplu yazım ve yarıda
  kalan koşu "değişti" sayılır. Slug'ı koruyan okuma bilerek ayrı bırakıldı.
  Yanıtta `vitrin_degisti` / `vitrin_farklari`. Beklenen: −20–30 sn/gün.

Kalıcı kurallar: yayından sonra tüm sayfaları tarama yok (en çok 10 sayfa
örnek); kod değişiklikleri tek yayında toplanır; 12 Aralık'a kadar zorunlu
olmayan yayın yok; her günlük kontrolde Fluid Active CPU okunup not edilir
(hedef günde ≤ 5 dk; 30 günlük toplam 3 sa 40 dk'yı geçerse acil önlem).

Sıradaki adaylar (gerekirse): yasal sayfaları önbelleğe almak (önce veritabanı
hatasında boş sayfa üretmeyen sıkı okuma gerekir — `kunyeGetir` /
`getSiteContent` hatayı yutuyor), kadraj görsellerini doğrudan depodan vermek
(~−50 sn/gün), kategori/liste sayfalarını önbelleğe almak, düşük değerli
tarayıcılara robots kuralı, gece tazelemesini koşullu yapmak.
