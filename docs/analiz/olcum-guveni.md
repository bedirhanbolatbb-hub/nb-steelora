# Ölçüme neden güvenilebilir — 13 Eylül 2026

BB'nin sorusu netti: "kendi sitemin ziyaretçi sayısına ve diğer istatistiklere
dahil hiçbir şeyine güvenmiyorum." Haklıydı. Bu belge neyin bozuk olduğunu
ÖLÇÜMLE, ne yapıldığını da tek tek yazar.

## Bulunan kusurlar

### 1 · Tek bir tarama robotu, tüm trafiğin dörtte üçü

18 Ağustos – 13 Eylül arası 20.187 hareketin **13.607'si tek bir oturumdandı**:
91 dakikada 485 farklı sayfa, her biri ortalama 14 kez. Üç benzer oturumla
birlikte toplam **15.438 hareket — %76,5**.

Sonucu: 27 Ağustos'ta panel 14.965 hareket gösteriyordu; o günün gerçek insan
trafiği 196 hareket ve 86 ziyaretçiydi. "En çok görüntülenen ürünler" listesi
o robotun gezme sırasıydı. Cihaz kırılımının %92 masaüstü çıkması da bundandı —
Türkiye'de takı satan bir sitede ağırlık telefondadır.

Tarayıcı adına bakan süzgeç bunu yakalayamıyordu: tarama araçları kendini
gerçek tarayıcı gibi tanıtıyor.

### 2 · Tek sayfa açıp giden robotlar

Davranış süzgecinden sonra geriye kalan **tek hareketlik 1.120 oturumun saat
dağılımı dümdüzdü**: gece 02:00–07:00 payı %17,7, yani 24 saate eşit yayılmış.
Gerçek müşteri trafiğinde (dört ve üzeri hareketli oturumlar) aynı pay **%1,3**.
İnsan gece üçte takı sitesi gezmez; o oturumların büyük kısmı insan değildi.

Sebep: sayfa görüntüleme SUNUCUDA yazılıyor (doğru karar — reklam
engelleyiciler etkilemiyor), ama JavaScript çalıştırmayan robotlar da ziyaretçi
gibi kaydediliyordu.

### 3 · Her sabah gelen rapor yanlış sayı yazıyordu

Gecelik özet bir günün yalnız **ilk 1.000 hareketini** okuyordu: PostgREST tek
istekte en çok 1.000 satır döndürür, koddaki `.limit(50000)` bu tavanı aşamaz.
27 Ağustos için özete 548 sayfa görüntüleme yazılmıştı; gerçeği **7.850**.
Yoğun her günde rapor eksik rakam bildirmişti.

### 4 · Panel ile mail farklı ziyaretçi tanımı kullanıyordu

Panel `session_id`, gecelik özet `visitor_id || session_id` sayıyordu. Aynı gün
için iki yer farklı sayı gösteriyordu (8 Eylül: mail 174, panel 173).

### 5 · Trafik kaynağı kutusu işe yaramıyordu

11.421 sayfa görüntülemenin **11.270'i "doğrudan"** yazıyordu. Yönlendiren
adres yalnız siteye İLK girişte doludur; ziyaretçi içeride her sayfaya
geçtiğinde kayıt yine düşüyor ama kaynağı boş oluyordu. Instagram'dan gelen bir
kişi 1 "Instagram" + 12 "doğrudan" üretiyordu.

### 6 · Kendi trafiğimiz sayılara karışıyordu

Panelden çıkıp vitrini gezmek, telefondan kontrol etmek, benim ölçümlerim —
hepsi ziyaretçi olarak yazılıyordu.

## Yapılanlar

| Kusur | Çözüm |
|---|---|
| Çok gezen robotlar | `lib/analytics/makine.ts` — kimliğe değil DAVRANIŞA bakar: günde 80+ farklı sayfa, ya da 30+ hareket ve dakikada 10+ hareket. Satır SİLİNMEZ, sayılmaz; geçmiş günler de düzelir |
| Tek sayfalık robotlar | `components/store/TarayiciDogrula.tsx` — gerçek tarayıcılar oturum başına bir kez kendini işaretler; panelde "Gerçek tarayıcı" kartı |
| Mailin 1.000 satır sınırı | Gecelik özet artık sayfalayarak okuyor |
| İki farklı ziyaretçi tanımı | Tek tanım; mail ile panel aynı sayıyı yazar |
| "%99 doğrudan" | Kaynak artık SAYFA değil ZİYARETÇİ sayar; her oturum girdiği ilk dış kaynakla bir kez |
| Kampanya ayrımı yok | `utm_source` etiketi taşınıyor; bağlantıyı etiketleyince kaynağı tahmin etmeye gerek kalmıyor |
| Kendi trafiğimiz | Panel oturumu açık tarayıcı sayılmaz; diğer cihazlar için `/api/olcum-tercihi?durum=kapali` |

## Sayıların anlamı

- **Günlük tekil ziyaretçi** — çerezsiz sayım. Aynı kişi aynı gün kaç kez
  gelirse gelsin bir, ertesi gün yeniden sayılır. Haftalık toplam, günlük
  sayıların toplamıdır; "kaç farklı kişi" değildir.
- **Gerçek tarayıcı** — JavaScript çalıştırdığı doğrulanan ziyaretçi. İhtiyatlı
  sayıdır: reklam engelleyici kullanan gerçek müşteri de doğrulanamayabilir.
  **Gerçek ziyaretçi sayısı bu ikisinin arasındadır.** Doğrulama 13 Eylül'de
  başladı; öncesi için kart "—" gösterir, uydurma sayı basılmaz.
- **Tek sayfada ayrılan** — tek hareket yapıp çıkanların oranı.
- **Ölçüm sağlığı** — panelin en üstünde: bu dönemde ne kadar robot trafiği
  ayıklandı, sayılar ne kadar güvenilir.

## Kampanya bağlantısı nasıl etiketlenir

Instagram profilindeki bağlantı ile hikâyedeki bağlantıyı ayırmak için adresin
sonuna etiket eklenir:

```
https://www.nbsteelora.com/urunler?utm_source=instagram&utm_medium=profil
https://www.nbsteelora.com/urunler?utm_source=instagram&utm_medium=hikaye
```

`utm_source` değeri panelde kaynak olarak görünür. Alan adı yazımı kullanılırsa
(instagram, google, facebook) doğru gruba düşer.

## Ne yapılmadı

**Satır silinmedi.** Robot trafiği ayıklanıyor ama kayıtlar duruyor: eşik
yanlışsa geri dönülebilsin, karar verirken ham veri elde kalsın diye.

**Üçüncü taraf ölçüm aracı eklenmedi.** Ne ücret ne de ziyaretçi verisinin
dışarı çıkması gerekiyor; eksik olan şey araç değil, doğru sayımdı.
