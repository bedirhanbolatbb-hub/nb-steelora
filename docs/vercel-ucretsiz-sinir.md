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
- **Vitrin önbelleği (ISR) bir güvenlik kararına bağlı — BB onayı bekliyor.**
  Önbellekten verilen sayfa istek başı nonce taşıyamaz; ISR için vitrinde
  nonce'suz sabit CSP (`script-src 'self' 'unsafe-inline'`) gerekir (Next'in
  belgesindeki "nonce'suz" yöntem). Bu, herkese açık sayfalarda satır içi
  script'e karşı korumayı gevşetir; 13 Kas'ta bu değişiklik otomatik güvenlik
  denetiminde durduruldu ve BB'ye soruldu. Panel, hesabım, ödeme, sipariş ve
  giriş sayfaları her durumda nonce'lu kalır. Onay gelirse plan (tek seferde):
  sabit CSP + nonce yollarının layout'larına `force-dynamic`; `page_view` ve
  `product_view` tarayıcıdan (bot/prefetch/kendi trafik kuralları aynı,
  TarayiciDogrula işareti korunur); hesap simgesi istemcide (çerez varlığı);
  ana sayfa önizlemesi istemcide (yönetici ucu); `/`, `/urun/[slug]`,
  `/blog/[slug]` için `revalidate = 3600` + `generateStaticParams() → []`;
  katalog okumaları çerezsiz istemciyle; ürün fiyat bloğu ve tahmini teslim
  istemcide (kampanya bitişi bağlamdan, `KampanyaSaglayici` bitişte indirimi
  düşürür); panel kayıt uçları ve senkron sonrası `revalidatePath('/',
  'layout')`. `/kategori` ve `/urunler` süzgeçleri sunucuda olduğu için
  dinamik kalır (12 sa'te ~4 sn).
- Sentry izleyicisinin aralığını 5 dakikaya çıkar (Sentry paneli; BB oturumu
  gerekir). Artık sunucu süresi harcamıyor; yalnız gereksiz istek.
- Gereksiz yayından kaçın: yalnız `docs/` ve `.md` değişen commit'ler
  yayınlanmasın (`deploy.yml` → `paths-ignore`), her yayın kadraj görsellerini
  yeniden ürettiriyor (bulgu 9). Bir sonraki kod yayınıyla birlikte.
- `public/favicon.ico` (bulgu 8) ve kadraj görsellerini kalıcı depoya yazma
  (bulgu 6/9) — bir sonraki kod yayınıyla.
