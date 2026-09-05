# Çekim rehberi — 32 kare (Faz 12 · vitrin cilası)

Kod tarafında ulaşılabilecek her şey yapıldı; siteyi bir üst lige taşıyacak
tek katman fotoğraf. Bu belge BB'nin çekim gününün birebir reçetesidir:
her kare hangi kutuya oturacak, nasıl kırpılacak, neye dikkat edilecek.

## Neden gerekli (ölçüldü)

- Bugünkü tüm ürün fotoğrafları aynı düzen: saten kumaş üstünde tek parça.
  Kart kutusunda ürün alanın **%15-20**'sini kaplıyor; geri kalanı kumaş.
  Vitrin uzaktan bakınca "aynı beyaz kare" tekrarı gibi okunuyor.
- Tenle ilişkisi olmayan takı ölçek vermiyor: müşteri kolyenin boynundaki
  boyunu, halkanın kulaktaki büyüklüğünü kestiremiyor. Bu, iade nedeni.
- Hero fotoğrafında takı karenin alt-orta bölgesinde; geniş ekranda kırpım
  onu kesiyordu (panelden odak seçimi eklendi, ama doğru kadraj çekimde
  çözülür).

## Ortak kurallar (her kare)

| konu | kural |
|---|---|
| oran | **4:5 dikey** (ürün ve koleksiyon), **3:4 dikey** (hero, kategori). Kare ya da yatay kare yok. |
| yerleşim | takı karenin **orta üçte-birinde**, en fazla **üst üçte-birde**. Alt üçte-bir hiç kullanılmaz — kırpım orayı atar. |
| doluluk | takı karenin en az **%35**'ini kaplasın (bugün %15-20). Küpe için daha yakın: %45. |
| zemin | üç zeminden biri: **fildişi keten**, **ten**, **açık traverten taş**. Saten yalnız bir-iki karede kalabilir; ana dil değil. |
| ışık | **pencere yanı, gün ortası, flaşsız.** Sert güneşse ince tül perde. Gölge yumuşak ve tek yönlü. |
| renk | kutu karesindeki pembe+altın uyumu için beyaz denge sıcak (5000K). Soğuk mavi ton yok. |
| netlik | odak takının **kendi** üstünde (taş, kilit, zincir halkası); kumaş bulanık kalabilir. |
| çözünürlük | kısa kenar en az **1800 px**; panel zaten ≤2400'e küçültüyor. |
| dosya | JPEG ya da WebP, en fazla 10 MB. |

Yapılmaz: ayna yansıması, sıcak-soğuk karışık ışık, çekim masası kenarı,
fiyat etiketi, kutu üstünde parmak izi, filtre/preset.

## Kareler — 32

### 1 · Hero (1 kare) — 3:4 dikey

Tenle. Boyunda ince kolye ya da bilekte bileklik; yüz görünmez (çene
hizasından aşağı). Takı karenin **orta üçte-birinde** — panelde odak "Orta".
Zemin: fildişi keten ya da düz duvar. Bu kare sitenin ilk 3 saniyesi;
en çok zaman buna.

Kırpım notu: geniş ekranda fotoğrafın üst ve alt ~%20'si atılır. Takı
ortada durursa her ekranda kadrajda kalır.

### 2 · Kategori kapakları (7 kare) — 3:4 dikey

Her kategori için tek "temsilci" kare; küçük kutuda (164 px) da okunmalı,
yani **tek parça, yakın plan, sade zemin**.

| kategori | kare |
|---|---|
| Kolye | boyunda, köprücük kemiği hizası, ten |
| Küpe | kulakta profil, saç toplu, ten |
| Bileklik | bilekte, el hafif kıvrık, keten |
| Yüzük | parmakta, el traverten taşa dayalı |
| Piercing | kulak kıvrımı yakın plan, ten |
| Erkek | erkek bileğinde/boynunda, koyu keten |
| Setler | kolye+küpe birlikte boyunda, ten |

### 3 · Koleksiyon kapakları (3 kare) — 4:5 dikey

Koyu zeminli bantta duruyorlar (fildişi değil, mürekkep zemin). Bu yüzden
**aydınlık** kareler seçin; koyu zeminde koyu fotoğraf kaybolur.

| koleksiyon | kare |
|---|---|
| Günlük Zarafet | tek ince kolye, sade tişört yakası, gün ışığı |
| Hediye Favorileri | pembe kutu açık, içinde takı, keten |
| İddialı Parçalar | kalın halka küpe ya da kalın zincir, profil |

### 4 · Ürün — tenle (20 kare) — 4:5 dikey

En çok satan / öne çıkan 20 ürün için **ikinci fotoğraf**. İlk fotoğraf
Trendyol'dan gelen düz kare kalır; bu kare kartta imleçle beliren ikinci
görsel ve ürün sayfasında ikinci kare olur. Amaç **ölçek**: takı vücutta.

Sıra önerisi (panel Kürasyon → Öne Çıkanlar ve Yeni Gelenler listeleri
esas): 8 bileklik · 6 küpe · 4 kolye · 2 yüzük.

Her karede: takı orta üçte-bir, doluluk %35+, ten zemin, gün ışığı.

### 5 · Atölye / hazırlık (1 kare) — 4:5 dikey

Hediye kutusu hazırlanırken: kutu, kurdele, el. **"Üretim" iması yok** —
Merchant Center kararı: biz seçiyor, kontrol ediyor, paketliyoruz. Kare
bunu anlatır. Hakkımızda ve hediye bandında kullanılır.

## Teslim

- Klasör adları: `hero/`, `kategori/<slug>/`, `koleksiyon/<slug>/`,
  `urun/<barkod>/`, `atolye/`.
- Yükleme: panel → Kürasyon (hero, kategori kapağı) · Koleksiyonlar (kapak)
  · Ürünler → ürün → görseller (ikinci kare `override_images`).
- Hero yüklendiğinde panel duyarlı kopyaları kendisi üretir; odak "Orta"
  seçilir.

## Kontrol listesi (çekimden önce)

1. Üç zemin hazır (keten, traverten, düz ten için model kolu/boynu).
2. Pencere yanı, gün ortası; tül perde elde.
3. Takılar parlatılmış, parmak izsiz.
4. Pembe kutu + kurdele (atölye karesi için).
5. Liste: bu belgedeki 32 satır çıktı olarak elde, her kare çekildikçe işaretlenir.
