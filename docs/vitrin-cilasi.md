# Vitrin cilası — Faz 12 (5 Eylül 2026)

BB'nin sorusu: "site tasarım olarak amatör gibi; en iyi hâline getir,
gerekirse 3D/animasyon." Site sıfırdan gezildi ve ölçüldü — masaüstü
(1512×766 Chrome), dizüstü (1440×900), tablet (714) ve **390 px gerçek
mobil**. Aşağıdaki her madde ölçüme dayanır; "muhtemelen" yok.

## Teşhis — özet

İskelet lüks sınıfında: Playfair + Inter ikilisi, fildişi-altın palet,
boşluk kullanımı, sepet çekmecesi, ödeme akışı, mobil ürün sayfası
(yapışkan satın alma çubuğu) hepsi doğru kurulmuş. "Amatör" hissini veren
şeyler dört başlıkta toplanıyor ve **hiçbiri 3D ile çözülmez**:

1. **Hız — ölçüldü, en ağır sorun.** Lighthouse mobil: performans **73**,
   LCP **7,2 sn**, telefona ana sayfada **1,1 MB** boşa görsel iniyor.
2. **Hero kadrajı.** Dizüstü ekranda (1512×766) takı kadraj dışında; tablet
   genişliğinde yalnız kumaş görünüyor. Fotoğraf dikey, kırpım "üst".
3. **Öne Çıkanlar düzeni.** Panelde 3 ürün seçili; düzen 8 için kurulmuş:
   2 dev kart + tek başına üçüncü kart + koca boşluk.
4. **Tutarsızlıklar.** WhatsApp balonu yeşil (paletteki tek yabancı renk),
   ödeme sayfasında indirim satırı yeşil, sepet çekmecesindeki ana düğme
   altın zeminde beyaz yazı (kontrast 2,8:1 — okunmuyor, Lighthouse
   erişilebilirlik 95'in nedeni), kart adları "gövde yazısı" diye kodlanıp
   katman hatası yüzünden serif basılıyor, mobil menünün yarısı boş.

Fotoğraf: bütün ürün kareleri aynı saten zemin, takı karenin %15-20'si.
Bu kodla çözülmez; reçetesi [cekim-rehberi.md](cekim-rehberi.md).

### 3D neden yok (üçüncü kez aynı karar)

Bu fiyat bandında (₺280-550) müşteri telefonda, çoğu zaman mobil veride.
3D model başına 2-8 MB, WebGL ilk kare 1-3 sn; ürün başına model üretimi
de ayrı maliyet. Lüks hissi bu sitede hızdan, kadrajdan ve tutarlılıktan
gelir; 3D bunların üçünü de geriye götürür.

## Yapılanlar — 12 madde

### A · Hız

| # | ne | ölçülen kusur | yapılan |
|---|---|---|---|
| A1 | Hover görseli telefonda iniyordu | 8 kart × 100-210 KB, telefonda hover yok | Görsel yalnız imleç karta ilk geldiğinde bağlanır (`hover:hover` ortamında) |
| A2 | Tek boyutlu kart görselleri | büyük kart 1100 px istiyor, mobil kutusu 182 px | `next/image` artık `sizes`'a göre her ekran basamağını Trendyol CDN'inden ayrı ister (`trendyolYukleyici`) — Vercel kotasına dokunmaz |
| A3 | Hero her telefona 1800×2400 | 135 KB, LCP öğesi | Kayıt anında sharp ile 640/960/1280 kopyalar üretilir, bucket'a yazılır (`lib/gorselVaryant.ts`); vitrin `sizes`'a göre seçer |
| A4 | İki büyük kart `priority` ile ön yükleniyordu | hero ile bant genişliği paylaşımı; ikisi de ilk ekranın altında | `priority` kaldırıldı |

### B · Hero kadrajı

Panelde slayt başına **kadraj odağı** (üst / orta / alt). Varsayılan orta.
Bugünkü fotoğraf için "orta" seçildi: 1512×766'da takı kadrajda.
Panel karşılığı: **var** (Kürasyon → Hero → "Kadraj odağı").

### C · Öne Çıkanlar

Editoryal düzen (2 büyük + 3'lü sıra) yalnız **5+ ürünle**; azsa düz
ızgara (3-4 sütun). Boşluk ve tek kalan kart yok. Panelde 8 ürün seçmek
BB'nin kararı; düzen her sayıda düzgün.

### D · Tutarlılık

- WhatsApp balonu: mürekkep zemin, beyaz simge (WhatsApp tek renk kullanıma
  izin verir). Hover'daki büyüme kalktı.
- Sepet çekmecesi "Ödemeye Geç" ve başarısız ödeme düğmesi: mürekkep zemin
  (kontrast 2,8 → 15:1). Site kuralı zaten böyleydi: "altın yalnız vurgu;
  düğme zeminleri mürekkep/fildişi".
- Yeşil metinler (ödeme indirim satırı, kupon/iletişim başarı, sipariş
  tamam sayfası) → altın koyu ton. Hata kırmızısı kaldı (anlam taşıyor).
- `h1-h6` serif kuralı `@layer base`'e alındı: `font-body` artık
  başlıklarda çalışıyor (Footer ve "Neden NB Steelora" etiketleri kod
  niyetine döndü: Inter, harf aralıklı). Kart adı **bilerek** serif ve bir
  kademe büyük (13 → 14/15 px).
- Mobil menü: üstte "Tüm Ürünler" ve "Yeni Gelenler", altta koleksiyonlar.

### E · İmza hareket dili

Tek kaynak `globals.css :root`: `--egri` (0.22,1,0.36,1) · `--sure-mikro`
200 ms · `--sure-gecis` 450 ms · `--sure-sahne` 650 ms. Beliriş, hero,
akordeon, yapışkan çubuk aynı eğriye bağlandı.

- **Paylaşılan öğe geçişi:** kart görseli ürün sayfası galerisine akarak
  büyür (React `<ViewTransition share="morph">`, Next 16 yerleşik).
  Desteklemeyen tarayıcıda normal geçiş; `reduced-motion`'da kapalı.
  Aynı ürünün ikinci yüzeyi (`Yeni Gelenler`, `Son Baktıklarınız`) ad
  çakışmasın diye geçişe girmez.
- Hero fotoğrafı yüklendikten sonra 8 sn'de 1,00 → 1,04 sessiz yakınlaşma
  (yalnız transform; LCP'ye girmez).
- Düğme basışı 0,98 ölçek (`.basis`); nav alt çizgisi soldan çizilir
  (`.nav-cizgi`).

Bütçe: eklenen CSS < 2 KB, JS eklenmedi (ViewTransition React'in içinde).

## Yapılmayanlar (bilerek)

- **LQIP / baskın renk yer tutucu:** zaten var (F6 — görselin 32 px hâli
  bulanık basılıyor). İkinci bir sistem gereksiz.
- **Sessiz kampanya bandı:** `PromoStrip` zaten bu işi görüyor; ikincisi
  aynı mesajı iki kez söylerdi.
- **Malzeme bandı:** gösterilecek doku fotoğrafı yok; boş kutu basılmaz.
  Çekimden sonra tek bileşenle eklenir.
- **Kartta daha yakın kırpım:** 428 ürünün kadrajı elle doğrulanmadan
  körlemesine yakınlaşmak takıyı kesebilir. Çekimle çözülür.

## Ölçüm

Önce (5 Eyl 21:14, Lighthouse 13.4 mobil, ana sayfa):
performans 73 · LCP 7,2 sn · FCP 1,0 sn · CLS 0 · TBT 180 ms · SI 3,4 sn ·
erişilebilirlik 95 · görsel israfı 1.101 KiB.

Sonra: bkz. bu dosyanın sonundaki "Sonuç" bölümü (dağıtımdan sonra
ölçülüp yazılır).

## Dönüşüm tabanı

Analiz panelindeki üçlü huni (ürün → sepet → ödeme → sipariş) bugünkü
değerleriyle karşılaştırma tabanıdır; site 2 siparişle henüz istatistik
üretmiyor. Tasarımın "dönüşümü artırdığı" iddiası ancak sipariş sayısı
anlamlı olunca ölçülür; şimdi iddia edilmez.

## Sonuç (5 Eyl 21:50, aynı araç, ana sayfa, mobil)

| ölçüt | önce | sonra |
|---|---|---|
| performans | 73 | **87** |
| LCP | 7,2 sn | **3,8 sn** |
| FCP | 1,0 sn | 1,7 sn |
| TBT | 180 ms | 40 ms |
| CLS | 0 | 0 |
| Speed Index | 3,4 sn | 3,3 sn |
| görsel israfı | 1.101 KiB | 304 KiB → koleksiyon kapakları da duyarlı yapıldı (ikinci commit) |
| hero dosyası (telefon) | 135 KB (1800 px) | 48 KB (960 px) · 23 KB (640 px) |

Not: aynı akşam ara bir ölçüm 54 verdi (JS yürütme 2,1 sn — paylaşımlı
ölçüm makinesinin gürültüsü; kod tarafında JS eklenmedi, bir sonraki koşu
87). Lighthouse tek koşuda ±10 oynar; eğilim üç koşuda da aynı yönde.

Canlıda doğrulananlar:
- kart görseli `srcset` 12 basamak, 390 px'te 480 px'lik dosya iniyor;
  telefonda hover görseli hiç istenmiyor (0/24 kart);
- hero: `object-position 50% 50%`, ön yükleme 960 px kopyayı çekiyor,
  1512×766'da takı kadrajda;
- kart → ürün sayfası geçişinde `::view-transition-group(urun-<id>)`
  oluşuyor ve tamamlanıyor (Chrome);
- WhatsApp balonu `rgb(28,26,23)`; kart adı Playfair 14 px;
- mobil menü 13 bağlantı, yatay taşma yok;
- Öne Çıkanlar 3 üründe tek sıra 3 sütun (masaüstü).
