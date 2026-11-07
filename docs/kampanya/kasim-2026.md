# Kasım 2026 indirimi — karar notu

**Kampanya:** tüm ürünlerde %25, sepet indirimi (kodsuz, koşulsuz), birleşmeye kapalı.
**Tarih:** 11 Kasım 2026 00.00 – 30 Kasım 2026 23.59 (İstanbul).

## Neden 7 Kasım değil 11 Kasım

Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği'nde 1 Temmuz 2026 tarihli ve
33297 sayılı Resmî Gazete ile yapılan değişiklik 1 Ağustos 2026'da yürürlüğe girdi:
mal satışında **indirimden önceki fiyat, indirimin başladığı tarihten önceki son on
gün içinde aynı satış kanalında uygulanan en düşük fiyattır.** Şartlı kampanyalar da
(ilk siparişe kod, sepet koşulu) aynı kurala tabi. Aykırılıkta reklam durdurma ve
108.370 TL'den başlayan idari para cezası.

NB25 (tüm ürünlerde %25) 31 Ekim 23.59'da bitti. 7 Kasım'da başlayan bir indirimin
on günlük penceresi 28 Ekim – 6 Kasım; o pencerede uygulanan en düşük fiyat NB25'in
indirimli fiyatı. Yani 7 Kasım'da "%25 indirim" yazmak, gerçekte hiç indirim
olmayan bir fiyatı indirimli göstermek olurdu. 11 Kasım 00.00'da başlayınca pencere
1–10 Kasım: yalnız liste fiyatı → üstü çizili fiyat ve %25 gerçek.

Kural kodda: `src/lib/campaigns/onGunKurali.ts` (panel uyarısı + ilk sipariş kodu
duyurusunun on gün susması). Testler: `__testler__/onGunKurali.test.mts`.

## Fiyat fotoğrafı

`fiyat-fotografi-2026-11-07.json` — kampanya öncesi liste fiyatları (sitenin kendi
beslemesinden, 7 Kasım). Kampanya başlamadan önce yeniden alınıp karşılaştırılır:
1–10 Kasım arasında artan fiyat varsa o ürünün üstü çizili fiyatı yanıltıcı olur.
Sitedeki fiyatlar Trendyol'dan geldiği için kampanya boyunca Trendyol'da fiyat
artırılmamalı.

## Vitrin

- Ana sayfa ilk ekranı: ilk slaytın yazısı yerine "Kasım indirimi · 11–30 Kasım /
  %25 / Tüm ürünlerde indirim / Alışverişe başlayın" + ücretsiz kargo satırı.
- En üst şerit: "Tüm ürünlerde %25 indirim, 11–30 Kasım • Tüm siparişlerde ücretsiz
  kargo, alt limit yok".
- Kartlar ve ürün sayfası: üstü çizili liste fiyatı + %25 (mevcut motor).
- Hero görseli yapay zekâ ile üretildi → köşede açıklama notu (aynı yönetmelik
  değişikliği: insandan ayırt edilemeyen yapay zekâ karakteri açıkça belirtilir).
