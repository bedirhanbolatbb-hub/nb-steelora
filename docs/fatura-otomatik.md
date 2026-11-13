# Otomatik fatura (Trendyol → e-Arşiv taslağı)

13 Kas 2026. BB'nin isteği: faturalar elle değil, birkaç günde bir otomatik
kesilsin; fatura başına yapay zekâ maliyeti sıfıra yakın olsun. Bu iş sunucuda
çalışır, Claude'u hiç çağırmaz; maliyeti sıfırdır.

## Ne yapar

Her sabah (vercel.json, 04:10 UTC = 07:10 TR) `/api/fatura`:

1. Trendyol'dan son 13 günün sipariş paketlerini okur (salt okuma).
2. GİB e-Arşiv Portal'a girer, son 21 günün belgelerini okur. Notunda sipariş
   numarası geçen her sipariş "faturası var" sayılır.
3. Faturası olmayan ve durumu yeni / işleme alınan / taşımada / teslim edilmiş
   olan siparişlere **taslak** fatura açar (imzasız, "Onaylanmadı").
4. BB'ye özet maili atar: açılan taslaklar, elle bakılacaklar, uyarılar.

İmza ve Trendyol'a yükleme BB'de: e-Arşiv Portal, Düzenlenen Belgeler,
taslakları seç, GİB İmza (tek SMS). Sonra Trendyol'da her siparişin Fatura
İşlemleri, Fatura Yükle.

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

## Sonraki adımlar (henüz yok)

- İmza: portalın SMS imzası (kodu BB girer) panelden toplu yapılabilir.
- Trendyol'a yükleme: imzalı faturanın dosyası Trendyol'un fatura yükleme
  ucuna sunucudan gönderilebilir.
