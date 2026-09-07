# Üyeliksiz iade — Faz 30 (7 Eylül 2026)

## Olay

İlk gerçek müşteri (NBS-1787569943108, üyeliksiz sipariş, 27 Ağu'da teslim
edildi) tüm ürünleri iade etmek istedi. Kendisine "Siparişlerim ekranından
iade talebi oluşturun" denildi — **o ekran yalnız üyede var**.

Ölçülen durum:

- `/api/account/orders/[id]/return-request` oturum ZORUNLU tutuyor (401).
- Üyeliksiz müşteri için sitede iade talebi açmanın hiçbir yolu yoktu.
- Panelde de açılamıyordu: iade/para iadesi düğmeleri müşterinin açtığı
  `order_requests` satırına bağlı, satır yoksa düğme yok.
- Sipariş durumu `delivered`; `delivered → cancelled` geçişi kurallarda
  yasak. Yani teslim edilmiş üyeliksiz bir siparişte **iade akışı hiç
  başlatılamıyordu**.

## Kargonomi araştırması (belgeler okundu)

Kargonomi API'sinde **iade gönderisi ucu yok**. Belgelenen uçlar yalnız
`/shipments` (oluştur/oku/sil), `/confirm-shipping-price`, `/shipments/cancel`,
barkod, fiyat karşılaştırma, bakiye, il/ilçe ve webhook. `is_return`,
`shipment_type` gibi bir alan da yok.

Ters yönlü gönderi (gönderici = müşteri) teoride `sender_*` alanlarıyla
kurulabilir ama `sender_tax_number` ve `sender_tax_place` zorunlu — bireysel
müşteride bu bilgi yok ve uydurulmaz (CLAUDE.md: uydurma değer yazılmaz).
Aynı kısıt `POST /warehouses` için de geçerli.

**Sonuç:** iade kodu firma bazındadır, kargo firmasıyla yapılan anlaşmadan
gelir; API'den üretilmez. Kargonomi'nin kendi rehberi de aynı akışı anlatıyor:
müşteri iade kodunu satıcıdan/kargo firmasından alır, şubeye götürür.

## Yapılanlar

| # | ne |
|---|---|
| 1 | `POST /api/kargo-takip/iade` — üyeliksiz iade talebi. Doğrulama kargo takipteki ile aynı: sipariş no + siparişteki e-posta İKİSİ BİRDEN. Sipariş `delivered` olmalı ve teslimden bu yana 14 günü geçmemiş olmalı (teslim tarihi `shipment_events`ten okunur). Saatte 5 istek sınırı. |
| 2 | Kargo takip sayfasında "İade talebi oluştur" — sipariş no + e-posta ile sorgulandığında ve sipariş teslim edildiyse görünür. İsteğe bağlı gerekçe kutusu. |
| 3 | Talep `order_requests`e `user_id = NULL` ile yazılır (sütun zaten nullable, DDL gerekmedi). Panelin onay/kod/teslim/para iadesi akışı üyeli taleplerle birebir aynı çalışır. |
| 4 | Müşteriye derhâl teyit maili (MSY m.11/2) + mağazaya bildirim — üyeli akışla aynı şablonlar. |
| 5 | **İade kodu artık zorunlu değil.** Kod yokken onay kilitleniyordu. Boş bırakılırsa müşteriye "karşı ödemeli gönderin" talimatı + iade adresi gider; ücret yine bize ait. Kargo firması zorunlu kalır (gidiş gönderisinden kendiliğinden gelir). |
| 6 | Kargo & İade sayfası düzeltildi: artık üyeliksiz yolu birinci sırada anlatıyor. |

## Kalıcı kural

Vitrine "yalnız üyede var" bir yol açılırsa, üyeliksiz karşılığı **aynı işte**
teslim edilir. Siparişlerin çoğu üyeliksiz geliyor.

## Açık kalan (BB)

Anlaşmalı iade kodu. Kargo firmasıyla (şu an HepsiJet) anlaşmadan gelir;
alındığında panelde Site Metinleri → `iade_kargo_kodu` alanına bir kez
girilir, sonrasında her iade onayında müşteriye kendiliğinden gider.
Alınana kadar akış karşı ödemeli talimatla çalışır.
