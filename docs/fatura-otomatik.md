# Otomatik fatura (Trendyol → e-Arşiv taslağı)

13 Kas 2026. BB'nin isteği: faturalar elle değil, birkaç günde bir otomatik
kesilsin; fatura başına yapay zekâ maliyeti sıfıra yakın olsun. Bu iş sunucuda
çalışır, Claude'u hiç çağırmaz; maliyeti sıfırdır.

## Ne yapar

Her gün iki kez (vercel.json: 04:10 UTC = 07:10 TR ve 15:10 UTC = 18:10 TR; akşam turu 14 Kas 2026'da, imzadan sonra yükleme beklemesin diye eklendi) `/api/fatura`:

1. Trendyol'dan son 13 günün sipariş paketlerini okur (salt okuma).
2. GİB e-Arşiv Portal'a girer, son 21 günün belgelerini okur. Notunda sipariş
   numarası geçen her sipariş "faturası var" sayılır.
3. Faturası olmayan ve durumu yeni / işleme alınan / taşımada / teslim edilmiş
   olan siparişlere **taslak** fatura açar (imzasız, "Onaylanmadı").
4. BB'nin imzaladığı faturaları denetleyip Trendyol'da kendi siparişine
   yükler (14 Kas 2026'dan; yükleme anahtarı açıksa — aşağıda).
5. BB'ye özet maili atar: açılan taslaklar, yüklenenler, elle bakılacaklar,
   uyarılar.

İmza BB'de: e-Arşiv Portal, Düzenlenen Belgeler, taslakları seç, GİB İmza
(tek SMS). İmzadan sonraki ilk turda fatura Trendyol'a kendiliğinden gider.

## Fatura biçimi

BB'nin elle kestiği örneklerden birebir (GIB2026000000001 ve 003):

| | Normal satış | Mikro ihracat |
|---|---|---|
| Tip | SATIS | ISTISNA |
| Alıcı | TCKN 11111111111, ad soyad, adres | aynı, ülke yabancı |
| Kalem | Trendyol'daki ürün adı ("… NBB094, Standart") | aynı + GTİP 711719009029 |
| Birim fiyat | faturalanacak tutar / 1,2 | faturalanacak tutar |
| KDV | %20 | %0 |
| Not | `YALNIZ: <yazıyla>` + `SİPARİŞ NO:<no>` | 3065 s. KDV K. 11/1-a ve 12 istisna metni, İstisna Kodu 301, Sipariş No, Toplam Tutar yazıyla |

Kurumsal fatura isteyen siparişte alıcının vergi numarası ve vergi dairesi
kullanılır (10 hane VKN için unvan; 11 hane için ad soyad).

Tutar Trendyol'un "Faturalanacak Tutar"ıdır. Bunun için satış fiyatından hem
satıcı indirimi hem de Trendyol'un karşıladığı indirim düşülür. Trendyol'un
karşıladığı kısım Trendyol'a ayrıca faturalanır; bu sistem onu kesmez.

%20 KDV'de bazı tutarlar kuruşu kuruşuna kurulamıyor (391,65 için
326,38 + 65,28 = 391,66). Bu durumda satır başına 1 kuruşa kadar farka
izin verilir.

## Kesmediği durumlar

Bu durumlarda sistem fatura açmaz, siparişi mailde "elle" olarak bildirir:

- siparişin birden çok paketi var;
- siparişte iptal ya da iade edilmiş satır var;
- para birimi TL değil;
- satır tutarları faturalanacak tutarı tutmuyor;
- kurumsal fatura istenmiş ama vergi numarası ya da vergi dairesi eksik;
- GİB taslağı reddetti (örneğin alıcı e-Fatura mükellefi).

Mikro ihracatın ISTISNA taslağı BB'nin GIB…001 faturasının alan yapısıyla
kuruldu, ancak sistem henüz canlıda bir mikro ihracat taslağı açmadı. İlk
mikro ihracat siparişinde taslağın gerçekten açıldığı ve doğru göründüğü
mailden ve portaldan kontrol edilmeli.

## Mükerrer koruması

- GİB'deki her belge (taslak, imzalı, silinmiş, iptal) sayılır. BB'nin sildiği
  bir taslak geri açılmaz.
- Kesme turu kalıcı kilitle tekleşir: `alert_state` tablosundaki
  `fatura_kilit` satırı, ömrü 10 dakika. Kilit taramadan önce alınır.
- Bir belgenin notu okunamazsa tur hiç kesmeden biter.
- Bir turda en fazla 20 taslak açılır.

## Kurulum (BB)

Vercel → nb-steelora → Settings → Environment Variables (Production):

| Değişken | Değer |
|---|---|
| `GIB_KULLANICI` | e-Arşiv Portal (İnteraktif Vergi Dairesi) kullanıcı kodu |
| `GIB_SIFRE` | aynı girişin şifresi |
| `FATURA_OTOMATIK` | `evet` — her sabahki tur açılır; silinirse ya da başka bir değer girilirse tur kapanır |

Şifre yalnız sunucuda durur; hiçbir yere yazılmaz, loglanmaz. Vercel hesabına
erişen herkes bu bilgiyle fatura kesebilir; Vercel hesabının iki adımlı
doğrulaması açık olmalı.

## Deneme

- Önizleme: panel oturumu açıkken `GET /api/fatura`. Neyin kesileceğini JSON
  olarak gösterir, hiçbir şey açmaz. GİB bilgisi girilmişse girişi de dener;
  bağlantının çalıştığı buradan anlaşılır.
- Şimdi kes: panel oturumuyla `POST /api/fatura`. Sabahki turla aynı işi
  yapar, anahtar kapalı olsa da çalışır.

Panel karşılığı: buton yok; sonuç maille gelir.

## Trendyol'a yükleme (14 Kas 2026)

BB'nin isteği: imzadan sonra Trendyol'a yüklemeyi de sistem yapsın; ama
yanlış siparişe yanlış fatura yüklemek başkasının kimlik ve adres bilgisini
üçüncü kişiye vermek demek, cezası ağır. Bu yüzden yükleme şüphede durur:
bir denetim bile geçmezse fatura yüklenmez, mailde "elle" olarak yazılır.

### Yol: fatura bağlantısı

Trendyol iki yol tanıyor: PDF dosyası ya da fatura bağlantısı (entegratör
yolu; `POST /integration/sellers/{id}/seller-invoice-links`). e-Arşiv Portal
PDF vermiyor; HTML görüntü veriyor. Sunucuda PDF üretmek ağır bir tarayıcı
gerektirirdi. Bağlantı yolu bunun yerine:

- Görüntü GİB'in kendi HTML'idir (`EARSIV_PORTAL_FATURA_GOSTER`), hiç
  değiştirilmez. İçinde GİB'in karekod betiği ve logolar var, dış kaynak yok.
- Supabase Storage'da ÖZEL `faturalar` kovasına sıkıştırılarak yazılır
  (`goruntu/<anahtar>.html.gz`), yanına kişisel veri içermeyen kaydı
  (`kayit/<anahtar>.json`: sipariş, paket, belge, ETTN, tutar, zaman).
- Bağlantı `https://www.nbsteelora.com/fatura/<anahtar>`; anahtar 128 bit
  rastgele. Sayfa önbelleğe girmez, arama motoruna kapalı (robots + başlık),
  `sandbox` içinde açılır: karekod betiği çalışır ama sitenin çerezlerine ve
  deposuna erişemez.
- Trendyol bağlantıyı müşteriye kendi e-postasıyla gönderir. **Trendyol
  kuralı: bağlantı 8 yıl açık kalmalı.** Site ve kova bu süre boyunca
  kapatılmamalı; taşınırsa `/fatura/<anahtar>` adresleri korunmalı. Görüntü
  kaybolursa kayıttaki ETTN ile GİB'den aynı görüntü yeniden alınabilir.
- Geri alınabilirlik bu yolun güvenlik artısı: yanlış bir yükleme fark
  edilirse görüntü silindiği an bağlantı 404 olur.

### Denetimler (hepsi geçmeli; lib/fatura/eslesme.ts, yukleme.ts)

1. Siparişi anan TEK bir GİB belgesi var ve imzalı ("Onaylandı"). Birden
   çok belge (silinmiş taslak dahil) varsa elle.
2. Sipariş tek paketli.
3. Belge numarası Trendyol biçiminde (3 harf/rakam + 13 rakam); listedeki
   numara ve ETTN ile ayrıntıdaki aynı.
4. Belgenin notunda tek bir sipariş numarası var ve o, bu sipariş.
5. Paketten şimdi yeniden hazırlanan fatura ile GİB'deki belge alan alan
   aynı: fatura tipi, para birimi, alıcı VKN/TCKN, adı, soyadı, unvanı
   (listedeki Alıcı sütunu da), kalem sayısı, her kalemin adı ve miktarı,
   ödenecek tutar (kuruşu kuruşuna), Trendyol'un faturalanacak tutarı.
   Ad karşılaştırmasında yalnız boşluk, büyük/küçük harf ve I/İ farkı yok
   sayılır.
6. Fatura tarihi siparişten önce değil, gelecekte değil.
7. GİB görüntüsünde belge numarası ve ETTN geçiyor.
8. Yüklemeden hemen önce Trendyol'dan sipariş taze okunur: tek paket, aynı
   paket no, faturası yok, durumu uygun; 5–6 taze paketle yeniden yapılır.
9. Görüntü depoya yazıldıktan sonra bağlantı sitenin kendisinden açılıp
   denenir (200 + belge no); açılmazsa silinir, Trendyol'a gitmez.
10. Trendyol 409 derse (pakete daha önce fatura verilmiş) görüntü silinir.
    Cevap belirsizse (zaman aşımı) görüntü kalır, mailde yazılır; sonraki tur
    paketteki bağlantıya bakar.
11. Gönderimden sonra paket yeniden okunur: bağlantı bizimki mi.

Tur başına en çok 10 yükleme; rotanın 60 sn sınırı yüzünden 40. saniyeden
sonra yeni yükleme başlatılmaz, kalan sonraki tura kalır.

### Anahtar, önizleme, geri alma (panel oturumuyla)

- Önizleme `GET /api/fatura`: `yuklenecek` (imzalı ve denetimden geçen),
  `imzaDenetimi` (imza bekleyen her taslak imzalansa geçer mi), `elle`
  nedenleri, `otomatikYukleme` (anahtarın durumu). Hiçbir şey yazmaz.
- Bir siparişin yüklenecek sayfası: `GET /api/fatura?goruntu=<sipariş no>`
  (aynı denetimler; imzasız taslak da gösterilir).
- Sabah turunun yüklemesi: `POST /api/fatura?yukleme=ac` / `?yukleme=kapat`.
  Anahtar veritabanında (`alert_state`, `fatura_yukle`); kapatmak o an
  etkilidir. Satır yoksa kapalıdır.
- Şimdi yükle: `POST /api/fatura?yukle=evet` (anahtara bakmaz).
- Geri al: `POST /api/fatura?geriAl=<anahtar>` → görüntü silinir (bağlantı
  404), paketteki bağlantı gerçekten bizimkiyse Trendyol'dan da kaldırılır
  (`seller-invoice-links/delete`). Doğru fatura sonra yeniden yüklenebilir.

Panel karşılığı: buton yok; sonuç maille gelir.

## Sonraki adımlar (henüz yok)

- İmza: portalın SMS imzası (kodu BB girer) panelden toplu yapılabilir.
- Siparişten 13 gün sonra imzalanan fatura sabah turunun penceresinin
  dışında kalır (Trendyol tek sorguda 2 hafta veriyor); o durumda elle
  yüklenir. Gerekirse pencere ikiye bölünerek genişletilir.
