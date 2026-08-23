# Yedekleme ve Geri Yükleme

> Faz 19'da kuruldu. Supabase **Free planda otomatik yedek yoktur** — sipariş,
> müşteri, adres ve kampanya verisi tek kopya hâlinde durur. Yanlış bir `DELETE`
> ya da bir migration kazası geri alınamaz. Bu belge, o kazanın nasıl geri
> alınacağını anlatır.

## Ne yedekleniyor

`/api/backup` ucu, veritabanındaki **bütün tabloların tam JSON dökümünü** alır,
gzip'ler ve Supabase Storage'daki **private `backups`** bucket'ına yazar.

Tablo listesi **elle tutulmaz**: PostgREST'in OpenAPI kökünden çalışma anında
keşfedilir. Yarın eklenen bir tablo, kod değişmeden yedeğe girer. (`products_display`
bir view olduğu için dışarıda bırakılır — `products`'tan zaten türetilir.)

Dosya adı: `YYYY-AA-GG-<zamandamgası>.json.gz`

Dosya içeriği:

```json
{
  "uretildi": "2026-08-23T04:00:12.000Z",
  "kaynak": "https://<proje>.supabase.co",
  "surum": 1,
  "tablo_sayisi": 28,
  "satir_sayilari": { "products": 520, "orders": 1, "...": 0 },
  "okunamayan_tablolar": {},
  "veri": { "products": [ … ], "orders": [ … ] }
}
```

`okunamayan_tablolar` **boş olmalıdır**. Doluysa o tablo yedekte yok demektir —
sebebini araştırın, yedeğe güvenmeyin.

## Ne zaman çalışıyor

| | Ne zaman | Nerede tanımlı |
|---|---|---|
| Otomatik | Her **pazar 04:00** (Vercel cron, ±59 dk) | `vercel.json` |
| Elle | Panel → Sistem → **Yedekler** → "Şimdi yedek al" | `/panel/yedekler` |

**Saklama:** en yeni **8 yedek** (≈8 hafta) tutulur, eskiler her koşuda otomatik
silinir.

> Vercel **Hobby** planında cron'lar en sık **günde bir** çalışabilir. Haftalık
> ifade (`0 4 * * 0`) bu kuralın altında kaldığı için sorunsuz çalışır.

## Yedeği indirme

Panel → Sistem → **Yedekler** ekranındaki "indir" bağlantısı. Bucket private
olduğu için bağlantılar **imzalıdır ve 30 dakika sonra geçersiz olur** — dosyada
müşteri e-postası, açık adres ve T.C. kimlik numarası vardır, süresiz bir
bağlantı bırakılmaz.

Dosyayı açmak için:

```bash
gunzip -c 2026-08-23-1787....json.gz > yedek.json
# tablo bazında satır sayıları
python3 -c "import json;d=json.load(open('yedek.json'));print(d['satir_sayilari'])"
```

---

# GERİ YÜKLEME

> **Önce durun.** Geri yükleme veri kaybettirebilir. Aşağıdaki adımları sırayla
> uygulayın ve **her adımda çıktıyı okuyun.**

## Adım 0 — Zararı durdurun

Yanlış silme hâlâ sürüyorsa (bozuk bir betik koşuyorsa) önce onu durdurun.
Gerekiyorsa Vercel → Project → **Pause** ile siteyi geçici kapatın; bozuk veriye
yeni sipariş yazılmasındansa kısa bir kesinti yeğdir.

## Adım 1 — Bugünün hâlini yedekleyin

Geri yüklemeden **önce** mevcut durumun yedeğini alın. Yanlış yedeği geri
yüklerseniz geri dönebilmelisiniz.

Panel → Yedekler → **Şimdi yedek al**.

## Adım 2 — Doğru yedeği seçin ve indirin

Olaydan **önceki** en yakın yedeği seçin. `satir_sayilari` alanına bakıp
beklediğiniz sayıları taşıdığını doğrulayın.

## Adım 3 — Yalnızca ETKİLENEN tabloyu geri yükleyin

**Tüm veritabanını geri yüklemeyin.** Neredeyse her olayda tek bir tablo
etkilenir; diğerlerini geri yüklemek olaydan sonra gelen gerçek siparişleri
ve müşterileri siler.

### 3a. Tablonun satırlarını SQL'e çevirin

Yerel makinede:

```bash
gunzip -c yedek.json.gz > yedek.json
python3 - <<'PY'
import json
TABLO = 'orders'          # geri yüklenecek tablo
d = json.load(open('yedek.json'))
satirlar = d['veri'][TABLO]
print(f"-- {TABLO}: {len(satirlar)} satır")
print(f"INSERT INTO public.{TABLO} SELECT * FROM jsonb_populate_recordset(null::public.{TABLO}, $veri$")
print(json.dumps(satirlar, ensure_ascii=False))
print("$veri$::jsonb) ON CONFLICT (id) DO NOTHING;")
PY
```

`jsonb_populate_recordset` kolon adlarını kendisi eşler; kolon sırası
değişmişse bile çalışır ve elle `INSERT` listesi yazma hatasını ortadan
kaldırır.

### 3b. Supabase SQL Editor'de çalıştırın

**Önce bir işlem içinde deneyin:**

```sql
BEGIN;

-- (3a çıktısını buraya yapıştırın)

-- Beklediğiniz sayı geldi mi?
SELECT count(*) FROM public.orders;

-- Doğruysa:
COMMIT;
-- Yanlışsa:
-- ROLLBACK;
```

`ON CONFLICT (id) DO NOTHING` yalnız **eksik** satırları geri getirir; olaydan
sonra oluşmuş gerçek kayıtlara dokunmaz. Bu, yanlışlıkla silinen satırları
kurtarmanın en güvenli yoludur.

### 3c. Satır İÇERİĞİ bozulduysa (silinme değil)

Bu durumda `DO NOTHING` yetmez, `DO UPDATE` gerekir:

```sql
BEGIN;
CREATE TEMP TABLE gecici_orders (LIKE public.orders);
INSERT INTO gecici_orders
SELECT * FROM jsonb_populate_recordset(null::public.orders, $veri$ … $veri$::jsonb);

-- Neyin değişeceğini ÖNCE görün:
SELECT o.id, o.status AS simdiki, g.status AS yedekteki
FROM public.orders o JOIN gecici_orders g USING (id)
WHERE o.status IS DISTINCT FROM g.status;

-- Doğruysa uygulayın:
UPDATE public.orders o SET status = g.status, total = g.total
FROM gecici_orders g WHERE o.id = g.id;

COMMIT;
```

## Adım 4 — Doğrulayın

```sql
SELECT count(*) AS toplam, count(*) FILTER (WHERE is_active) AS aktif FROM public.products;
SELECT count(*) FROM public.orders;
```

Beklenen tripwire: **ürün 520 · aktif 432 · sipariş 1** (Ağustos 2026 itibarıyla;
güncel sayıyı panelin ana ekranından teyit edin).

Ardından sitede: ana sayfa açılıyor mu, bir ürün sayfası 200 mü, `/api/health`
`"status":"ok"` diyor mu.

## Adım 5 — Siteyi geri açın

Vercel → Project → **Unpause** (Adım 0'da duraklattıysanız).

---

## Sık karşılaşılan durumlar

**"Yabancı anahtar hatası alıyorum."**
Tabloları bağımlılık sırasıyla geri yükleyin: önce `products`, `user_profiles`,
`campaigns`; sonra `orders`, `shipments`, `order_requests`, `campaign_coupons`.

**"Yedekte olmayan yeni bir kolon var."**
`jsonb_populate_recordset` eksik kolonları `NULL`/varsayılan bırakır, hata
vermez. Yedekte olup tabloda olmayan kolonlar sessizce yok sayılır.

**"Storage'daki görseller de yedekleniyor mu?"**
**Hayır.** Bu yedek yalnız veritabanıdır. `media` bucket'ındaki panel görselleri
ayrıdır; ürün görselleri zaten Trendyol CDN'inde durur ve senkronla geri gelir.

**"Yedek alınamıyor / cron çalışmıyor."**
Panel → Yedekler ekranı son yedek 8 günden eskiyse uyarı gösterir. Elle
tetikleyip hatayı görün; `CRON_SECRET` ve `SUPABASE_SERVICE_ROLE_KEY`
tanımlı mı kontrol edin.
