# Kapsamlı SEO denetimi — 11 Eylül 2026

15 başlıklı dış denetim listesi canlı site üzerinde tek tek ölçüldü. Aşağıdaki
her satır ÖLÇÜM sonucudur; "muhtemelen" yoktur. Ölçüm yöntemi: her adres
tarayıcıdan `fetch` ile çekilip HTML'i ayrıştırıldı (sayfa kaynağı, JavaScript
çalışmadan önceki hâli — arama motorunun gördüğü hâl).

## Özet

| | |
|---|---|
| Denetlenen başlık | 15 |
| Zaten doğru bulunan | 11 |
| Gerçek kusur bulunan | 4 |
| Bu denetimde düzeltilen | 4 |

Listenin büyük bölümü Faz 11A/11F/18/31'de zaten kapatılmıştı. Yeniden
yapılmadı; yalnız kanıtı yazıldı.

---

## Bulunan kusurlar ve yapılanlar

### 1 · Paylaşım kartı 300'den fazla sayfada ana sayfayı gösteriyordu — KRİTİK

Ölçüm (11 Eyl):

| sayfa | og:title | og:url | twitter:title |
|---|---|---|---|
| `/sss` | NB Steelora \| Fine Jewellery | ana sayfa | NB Steelora \| Fine Jewellery |
| `/urunler` | NB Steelora \| Fine Jewellery | ana sayfa | NB Steelora \| Fine Jewellery |
| blog yazıları (26) | NB Steelora \| Fine Jewellery | ana sayfa | NB Steelora \| Fine Jewellery |
| ürün sayfaları (279) | *doğru* | **yok** | NB Steelora \| Fine Jewellery |
| kategori (7) | *doğru* | *doğru* | NB Steelora \| Fine Jewellery |

Yani bir ürün ya da yazı bağlantısı X'te paylaşıldığında kartta ürünün adı
değil markanın genel başlığı çıkıyordu; `/sss` gibi sayfalarda ise hem başlık
hem adres ana sayfanınkiydi.

**Sebebi.** Kök `layout.tsx` içinde `openGraph` ve `twitter` nesnelerine ana
sayfanın başlığı ve açıklaması SABİT yazılmıştı. Next'te bu iki alan iç içe
nesnedir ve "sığ birleşme" kuralına tabidir:

- nesneyi hiç tanımlamayan sayfa kökünkini **olduğu gibi devralır**;
- nesneyi tanımlayan sayfa kökünkini **tamamen siler** (bu yüzden ürün
  sayfalarında `og:site_name`, `og:locale`, `og:type` de kayıptı), ama
  `twitter` ayrı bir alan olduğu için yine kökten gelirdi.

**Yapılan.** `src/lib/seo.ts` içine `sayfaUstVerisi()` eklendi: başlık,
açıklama, kanonik adres ve paylaşım görselini bir kez alıp hem `openGraph` hem
`twitter` kartını aynı değerlerle basar. 13 sabit sayfa + ürün + kategori +
koleksiyon + blog yazısı bu yardımcıya geçirildi. Bundan sonra eklenen sayfa da
doğru olur.

Ek kazanç: blog yazıları artık kendi kapak görselleriyle paylaşılıyor (önceden
marka kartı), yazı sayfaları `og:type: article` bildiriyor.

### 2 · Kategori sayfalarının türü belirsizdi

`/urunler` kendini `CollectionPage` olarak bildiriyordu, yedi kategori sayfası
bildirmiyordu (yalnız `BreadcrumbList` vardı). Eklendi; ad ve açıklama
sayfanın kendi tanıtım metninden gelir, yeni cümle uydurulmadı.

### 3 · Ürün sayfasındaki dört küçük görselin alt metni boştu

13 görselin 4'ü (galeri şeridi) `alt=""` ile basılıyordu. Ekran okuyucu ve
arama motoru bunları adsız görüyordu. Artık `"<ürün adı> — 2. görsel"
` biçiminde; düğmenin sesli etiketi de aynı düzeltildi.

### 4 · Alt şerit rozeti kapak görseliyle yarışıyordu

Footer'daki iyzico rozeti ekranın en altında olmasına rağmen öncelikli
yükleniyordu. `loading="lazy"` eklendi.

---

## Zaten doğru olan başlıklar (kanıtıyla)

**Üst veri.** 21 sayfanın hepsinde kendi başlığı, kendi açıklaması ve kanonik
adresi var. Başlık şablonu `%s | NB Steelora`; marka adının iki kez basıldığı
sayfalarda `absolute` kullanılıyor.

**Anlamsal HTML.** Ana sayfa: `h1:1 h2:9 h3:26`, `header/nav/main/footer` birer
tane. Ürün sayfası `h1:1`. 32 görselin tamamının alt metni dolu. Kapak görseli
öncelikli, gerisi tembel; en büyük görsel 1,24 sn'de boyanıyor.

**Kanonik.** Her sayfada var. `?sayfa=2` kendine kanonik (içeriği farklı),
`?siralama=` ve fiyat filtreleri temiz adrese kanonik. Kardeş varyantlar grubun
kapağına kanonik (Faz 18).

**Site haritası.** 328 adres: 279 ürün, 26 yazı, 7 kategori, 3 koleksiyon,
13 sabit sayfa. `lastmod`, `changefreq`, `priority` dolu. Giriş/kayıt/sepet gibi
sayfalar bilerek dışarıda.

**robots.txt.** `/admin/`, `/panel/`, `/api/` kapalı; site haritası bildirilmiş.

**Yapısal veri.** Ana sayfa `Organization` + `WebSite`; ürün `Product` + `Offer`
(sku, marka, kategori, malzeme, ödenen fiyat, para birimi, stok durumu, kargo
süresi, iade koşulu) + `BreadcrumbList`; `/sss` `FAQPage`; `/iletisim`
`ContactPage`; hukuki metinler `WebPage`; blog `Blog` + `Article`. Ürün
şemasındaki fiyat (349,93 ₺) sayfada yazan fiyatla birebir aynı — uyuşmazlık
yok. Puan alanı yalnız gerçek onaylı yorum varsa basılıyor.

**404.** Olmayan ürün ve kategori adresleri 404 veriyor, sayfa `noindex`.
Pasife alınan ürünün birebir karşılığı varsa adres kalıcı olarak (308) oraya
taşınıyor, yoksa 404'te kalıyor.

**Stokta olmayan ürün.** Katalogda şu an stoğu biten ürün YOK (12 liste sayfası
tarandı, hiçbiri "Tükendi" değil), bu yüzden canlı ölçüm yapılamadı. Kod
okundu: stok sıfırlanınca ürün pasife ÇEKİLMİYOR — pasife çekme yalnız ürün
Trendyol'dan tamamen kalktığında oluyor. Yani sayfa erişilebilir kalır, kart
"Tükendi" yazar, şema `OutOfStock` bildirir. Doğru davranış; sayfayı silmek
birikmiş sıralamayı atmak olurdu.

**Hız.** Mobil Lighthouse 87, en büyük görsel 3,8 sn (Faz 12 öncesi 73 ve 7,2
sn). Görsel israfı kapatıldı.

**Yapay zekâ görünürlüğü.** `/llms.txt` yayında (10 Eyl); marka tanımı, ürün
sayısı, kategoriler, kargo ve iade süreleri kaynak koddan ve canlı veritabanından
türetiliyor, elle yazılmış tek cümle yok.

---

## Yapılmayanlar ve sebebi

**`ItemList` şeması.** Kategori sayfalarına ürün listesini `ItemList` olarak
eklemek listede öneriliyordu. Eklenmedi: Google bu işaretlemeyi yalnız kendi
belirlediği karusel türlerinde kullanıyor, mağaza kategorisi bunlardan biri
değil. Faydası olmayan işaretleme bakım yükü.

**Arama işlevi şeması (`SearchAction`).** Sitede metin aramasının kendi adresi
yok (arama bir pencerede çalışıyor). Olmayan bir adresi arama motoruna vaat
etmek yanlış olurdu.

**Ürün başlığının uzun hâlini `h1` yapmak.** Sayfa başlığı uzun pazaryeri adını
("Mektup Ve Tüy Charm Uçlu Çelik Kadın Kolye"), `h1` ise vitrin adını ("Mektup
Tüy Kolye") taşıyor. Bu bilinçli bir vitrin kararı; SEO uğruna değiştirilmedi.

**Dil alternatifleri (`hreflang`).** Site tek dilli; `lang="tr"` yeterli.
