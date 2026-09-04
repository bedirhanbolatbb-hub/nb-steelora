# Görsel boyutu — neyi neden istiyoruz (4 Eylül 2026, Faz 11A-FIX · F1/F6)

## Ölçülen kusur

Sitedeki HER yüzey görselin en büyük hâlini indiriyordu. Canlıda ölçüldü:

| yüzey | kutu (CSS px) | inen dosya |
|---|---|---|
| anasayfa hero | 646 × 679 | 1800 × 2400 · 280 KB |
| ürün kartı | ~340 (mobilde ~190) | 1200 × 1800 |
| PDP ana görsel | 640 | 1200 × 1800 |
| PDP küçük resim / varyant çipi | 56 | 1200 × 1800 |
| panel ürün listesi (520 satır) | 40–48 | 1200 × 1800 |

56 pikselik bir kutuya 1200 piksellik dosya gidiyordu — 460 kat fazla piksel.
Müşteri o süre boyunca boş fildişi kare görüyordu ("3-5 saniye bulanık").

## Çözüm — ücretsiz

**Trendyol CDN'i** istenen kutuya sığdırılmış hâli kendisi veriyor:

```
https://cdn.dsmcdn.com/mnresize/<en>/<boy>/<yol>
```

Ölçüldü (4 Eyl): oranı korur, kırpmaz, büyütmez. 1200×1800 kaynaktan
`mnresize/600/600` istendiğinde 400×600 döndü — yani kutuya SIĞDIRIR.
`mnresize/680/1360` → 680×1020, `mnresize/128/256` → 128×192.

Tek kaynak: `src/lib/images.ts → gorselBoyutu(url, enBoy)`. `enBoy` = kutu
genişliği × ekran yoğunluğu (2). Trendyol dışındaki adresler olduğu gibi döner.

**Bu yol Vercel'in görsel dönüşüm kotasına DOKUNMAZ.** Faz 9B'de `unoptimized`
kararı alınmıştı (kota dolunca `/_next/image` 402 dönüyor ve müşteri boş kutu
görüyor); o karar aynen duruyor. Burada `/_next/image` hiç kullanılmıyor,
adres doğrudan pazaryeri CDN'ine gidiyor.

## Panel medyası (hero, kategori kapakları)

Panelden yüklenen görseller Supabase Storage'da; orada ücretsiz küçültme YOK
(Supabase görsel dönüşümü ücretli bir eklenti — açılmadı).

Çözüm dosyanın kendisini küçültmek. Panel yükleyicisi (`MediaUpload`) zaten
uzun kenarı ≤1600 piksele indirip ≤300 KB hedefliyor; hero dosyası bu kural
gelmeden önce (15 Ağustos) yüklendiği için eski hâliyle duruyordu.

4 Eylül'de hero görseli aynı yükleyiciden geçirildi:

| | önce | sonra |
|---|---|---|
| boyut | 1800 × 2400 | 1200 × 1600 |
| dosya | 280 KB | **62 KB** |

Aynı fotoğraf, kırpma yok. Eski dosya bucket'ta duruyor; geri almak gerekirse
Kürasyon'dan eski adres yazılır:
`…/media/2026-08-15/msum803y-fwkd9i.webp`

## Bir daha büyümesin diye

Yeni bir yüzeye ürün görseli koyarken `gorselBoyutu(url, kutu × 2)` çağrılır.
`ProductImage` bileşeninde bu `enBoy` prop'udur; `bulanik` prop'u da inene
kadar görselin 32 pikselik bulanık hâlini basar (boş kare yanıp sönmez).
