# SEO / paylaşım denetimi — 11 Eylül 2026

BB, Twitter'da dolaşan "site kurarken AI'dan şunları iste" listesini getirdi.
Sekiz maddenin tamamı canlı sitede tek tek ölçüldü.

## Zaten vardı (dokunulmadı)

| madde | durum |
|---|---|
| Özelleştirilmiş 404 | ✓ gerçek 404 kodu, kendi başlığı, kendi metni, noindex |
| Meta açıklamalar | ✓ indekslenen 21 sayfanın hepsinde sayfaya özel |
| Sayfaya göre başlıklar | ✓ `title.template` ile "%s \| NB Steelora"; kategori/ürün kendi başlığını yazıyor |
| Semantik HTML | ✓ `header` · `nav` · `main` · `footer` · `section` doğru kullanılıyor |
| Kanonik etiketler | ✓ 29 yerde; varyant kardeşlerin kanonik'i grup kapağını gösteriyor (Faz 18) |
| robots.txt | ✓ panel/api/admin kapalı, site haritası bildiriliyor |
| Site haritası | ✓ 66 KB, statik + kategori + koleksiyon + ürün kapakları; noindex sayfalar bilerek dışarıda |
| OG görselleri | ✓ üretilen marka görseli; ürün sayfası kendi fotoğrafını kullanıyor |

## Ölçümde çıkan dört eksik — düzeltildi

### 1. Ana sayfada h1 YOKTU

Canlı HTML'de `h1` sayısı **0**. Sayfa doğrudan `h2` ile başlıyordu (10 adet
h2, 26 adet h3). Sebep: h1 yalnız `HeroCinema` içindeydi — o da hiç slayt
yokken devreye giren yedek düzen. Yayındaki `HeroSlider` bütün slaytları h2
basıyordu.

h1 sayfanın ne olduğunu söyleyen tek başlıktır; arama motoru ve ekran okuyucu
ilk onu arar. 5 Eylül'deki Lighthouse denetiminin "başlık öğeleri sırayla
azalan düzende değil" uyarısı da buydu.

**Düzeltme:** ilk slaydın başlığı h1, diğerleri h2 (sayfada tek h1 olmalı).

### 2. Kategori sayfalarında paylaşım görseli YOKTU

`/kategori/kolye` çekildi: `og:image` **yok**. Ürün, blog, hakkımızda, SSS ve
ana sayfada var. Sebep: kategori sayfası kendi `openGraph` nesnesini
tanımlıyor ve Next bu durumda dosya tabanlı görseli o nesneye EKLEMİYOR.

Sonuç: kategori bağlantısı WhatsApp ya da Instagram'da paylaşıldığında
görselsiz, düz yazı olarak çıkıyordu — kampanya paylaşımında en çok
kullanılacak bağlantı türü.

**Düzeltme:** kategori `openGraph`'ına marka görseli açıkça eklendi.

### 3. İki sayfa arama motoruna açıktı ve ana sayfanın başlığını taşıyordu

`/hesabim` ve `/siparis-tamamlandi` canlıda `index` durumundaydı ve ikisinin
de başlığı birebir `NB Steelora | Fine Jewellery` idi. Biri üyeye özel, diğeri
ödeme sonrası teşekkür sayfası — ikisinin de arama sonucunda yeri yok, ve aynı
başlık Search Console'da "yinelenen içerik" işareti.

**Düzeltme:** ikisine de kendi başlığı + `noindex, follow` (ödeme, sepet,
giriş, kayıt sayfalarında zaten uygulanan düzen).

### 4. llms.txt yoktu — listedeki tek gerçekten eksik madde

`/llms.txt` 404 dönüyordu.

Müşteriler ürün ve iade sorularını artık sohbet asistanlarına da soruyor.
Asistan siteyi okurken 60 KB'lık sayfa yerine bu tek dosyadan markanın ne
sattığını, kargo ve iade koşullarını, hangi sayfada ne olduğunu doğrudan alır.

**Eklendi.** Kritik kural: içindeki hiçbir sayı elle yazılmadı. Cayma süresi,
geri ödeme süresi ve kargo cümlesi sözleşme/kargo kaynak dosyalarından, ürün
sayısı canlı veritabanından okunuyor. Koşullar değişince dosya kendiliğinden
güncellenir; uydurma bilgi barındıramaz.

## Not

`llms.txt` robots.txt'te duyurulmaz — standart öyle bir alan tanımlamıyor,
adresin kendisi sözleşme gereği sabit. Yandex'e özel `host` satırı da
eklenmedi; işe yaramaz gürültü olurdu.
