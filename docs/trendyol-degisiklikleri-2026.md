# Trendyol 2026 değişiklikleri — nbsteelora.com etkisi (10 Eylül 2026)

BB'nin sorusu: "Trendyol 15 Ekim'de sipariş veren eski kapıyı kapatıyor, bir
sürü şey değişiyor. Bizim için yapmamız gereken var mı?"

Trendyol'un kendi değişiklik günlüğü ve servis limitleri sayfası okundu, her
madde bu projenin koduyla tek tek eşleştirildi.

## Önce en önemlisi: 15 Ekim bizi ETKİLEMİYOR

Kapanan uç:

```
https://apigw.trendyol.com/integration/order/sellers/{sellerId}/orders
```

**Bu proje Trendyol'dan sipariş çekmiyor.** Siparişler kendi sitemizden,
iyzico ile geliyor. Kodda Trendyol'a giden tüm adresler iki tabandan ibaret:

| kullandığımız uç | ne için |
|---|---|
| `GET /integration/product/sellers/{id}/products/approved` | onaylı ürün listesi (gecelik senkron) |
| `GET /integration/product/sellers/{id}/products/approved/inventory-and-price` | stok + fiyat |
| `POST /integration/inventory/sellers/{id}/products/price-and-inventory` | satış sonrası stok düşme |

`order` geçen tek bir Trendyol çağrısı yok (kodda `order_id` görülen yerler
bizim kendi sipariş kayıtlarımız). 15 Ekim'de hiçbir şey durmayacak.

## Madde madde — değişiklik / bizi etkiler mi

| değişiklik | tarih | bizi etkiler mi | neden |
|---|---|---|---|
| Sipariş ucu V2'ye taşınıyor, eskisi kapanıyor | 15 Eki 2026 | **hayır** | sipariş ucunu hiç kullanmıyoruz |
| Ürün servisleri V1 kapanışı | 10 Ağu 2026 | **hayır — zaten yapılmış** | ürün uçlarımız V2, geçiş daha önce tamamlandı |
| `origin` alanı zorunlu oluyor | 23 Eki 2026 | **hayır** | ürün OLUŞTURMA/GÜNCELLEME alanı; biz ürün yazmıyoruz, yalnız okuyoruz |
| `deliveryDuration` sadeleşmesi, `fastDeliveryType` kalkıyor | 30 Eyl 2026 | **hayır** | aynı sebep — ürün yazma alanı |
| Sipariş alan adları değişti (`merchantSku`→`stockCode`, `merchantId`→`sellerId`, `amount`→`lineGrossAmount`, `totalPrice`→`packageTotalPrice`) | 2 Nis 2026 | **hayır** | sipariş yükünün alanları; okumuyoruz |
| `getShipmentPackages` 10.000 kayıt sınırı | 2 Haz 2026 | **hayır** | o ucu kullanmıyoruz |
| `paymentMethod` alanı eklendi | 9 Eyl 2026 | **hayır** | sipariş/webhook alanı |
| Luxe platformu, `channelId` | 31 Tem 2026 | **hayır** | sipariş tarafı |
| **Ürün servislerine dakikalık istek sınırı** | **14 Eyl 2026** | **evet — ölçüldü, sınırın altındayız** | aşağıda |

## Tek gerçek risk: 14 Eylül'de başlayan istek sınırı

Satıcının listeleme kotasına göre basamaklı. En düşük basamak (50.000 ürün):

- Ürün okuma: **1000 istek/dk**
- Ürün yazma: 200 istek/dk
- Stok & fiyat yazma: 350 istek/dk (fiyatta ayrıca barkod başına 30/dk)

**Ölçüm (10 Eyl, panel senkron geçmişi):** gecelik koşu 9 sayfa, 424 ürün,
**8 saniye**. Sayfa başına 1 liste + ~1 stok/fiyat çağrısı → koşu başına
~27 istek, yani tepe hız **~200 istek/dk**. Okuma sınırının **beşte biri**.
Stok yazma sipariş kalemi başına tek çağrı; günde birkaç tane.

Yani sınır bizi bugün vurmuyor. Yine de tek bir 429 gecelik senkronu
düşürmesin diye ağ kuruldu (aşağıda).

## Yapılanlar

1. **Tanıtım başlığı (User-Agent) düzeltildi — asıl bulgu.**
   Trendyol bu başlığı ZORUNLU tutuyor ve biçimi şu:
   `{satıcı kimliği} - {entegratör adı}`, kendi yazdığımız entegrasyonda
   entegratör adı `SelfIntegration`, alfanümerik ve en çok 30 karakter.

   Bizimki `KarPanel - nbsteelora@gmail.com` idi. Üç kusuru vardı: satıcı
   kimliğiyle başlamıyordu, **başka bir ürünün adını** taşıyordu ve markanın
   e-posta adresini Trendyol'a giden her isteğin başlığında dışarı veriyordu.
   Trendyol şimdilik kabul ediyor; biçim denetimi başladığı gün senkron
   sessizce durur. Artık `{TRENDYOL_SUPPLIER_ID} - SelfIntegration`.

2. **429 (hız sınırı) ağı.** Trendyol 429 dönerse `Retry-After` varsa ona,
   yoksa artan beklemeye (2·4·8 sn, tavan 30 sn) uyup en çok 3 kez yeniden
   dener. Hem okuma hem stok yazma çağrılarını kapsıyor. Öncesinde tek 429
   bütün koşuyu hataya düşürüyordu.

## Kalıcı not

Bu projenin Trendyol yüzeyi kasten dar: **ürün oku, stok yaz.** Sipariş,
kargo paketi, iade, fatura uçlarının hiçbiri kullanılmıyor. Trendyol'un
sipariş tarafındaki her duyurusu bu yüzden bizi ilgilendirmiyor — kontrol
ederken önce `src/lib/trendyol/client.ts` içindeki iki taban adrese bak.

## Kapsam dışı — BB'ye hatırlatma

**KarPanel Trendyol siparişi ÇEKİYOR ve 15 Ekim kapanışı onu vurur.** Ayrı
ürün, ayrı depo; bu belgenin konusu değil. Orada `/orders` → `/v2/orders`
geçişi ve 2 Nisan'daki alan adı değişiklikleri ayrıca ele alınmalı.
