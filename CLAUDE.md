@AGENTS.md

# NB Steelora — çalışma kuralları

Bu dosya her oturumda geçerlidir. Kural ile kod çelişirse **dur ve sor**.

## Dokunma

- **Sipariş `NBS-1787569943108`** gerçek, teslim edilmiş bir sipariştir (₺1.154,72). Hiçbir işte etkilenmez — okumak serbest, yazmak yasak.
- **`trendyol_*` kolonlarına yazma.** Bunlar senkronun alanı. İşini `override_*` kolonlarında ya da render katmanında yap.
- **Fiyat ve stokta tek kaynak Trendyol'dur.** Vitrinde gördüğün fiyatı üreten hesap `override_price` + kampanya oranıdır; başka yerde yeniden hesaplama.
- **Ödeme başlatmada fiyatı istemciden okuma.** Tek kaynak `src/lib/campaigns/sepetOzeti.ts`. İstemciden gelen tutar yalnız doğrulama içindir.
- **Kampanya tavanı %35.** İndirim yığılması bu sınırı aşamaz.

## Her işte

- **Tripwire raporla:** aktif ürün sayısı · sipariş sayısı · `/urunler` kart sayısı. Değiştiyse neden değiştiğini yaz.
- **Panel karşılığı.** Vitrine yeni bir alan açtıysan panel karşılığını **aynı işte** teslim et. Rapora tek satır koy: `panel karşılığı: var` ya da `gerekmiyor`.
- **Kaç madde bitti, açık yaz.** "8/8 tamam" ya da "6/8 — 2'si şu sebeple açık".
- **Bulamazsan dur ve raporla.** Tahmin etme, uydurma değer yazma. Veri yoksa alan basılmaz.

## Yazarken

- **Marka sesi:** ölçüt [docs/marka-sesi.md](docs/marka-sesi.md). Emoji yok, ünlem yok, baskı dili yok ("son şans", "kaçırma"). Müşteriye **siz** diye hitap edilir. Uydurma iddia, sahte yorum, olmayan sertifika yazılmaz.
- **Yasal süreler tek kaynaktan:** `src/lib/legal/sozlesme.ts`. Kargo süreleri `src/lib/shipping.ts`. Sayfalarda gün sayısı elle yazılmaz.
- **Hukuki metni esaslı değiştirdiysen** sürümü de yükselt: `src/lib/legal/surum.ts`. Damga sipariş anında `orders.metadata`'ya yazılır; eski siparişler etkilenmez.
- **Animasyon:** yalnız `transform` ve `opacity`. `prefers-reduced-motion` altında kapalı. Sayfa başına **+5 KB** üst sınır.

## Doğrularken

- **Mobil = 390 px gerçek ölçüm.** Tarayıcıyı aç, ölç. "Muhtemelen sığar" kabul edilmez.
- **Canlıda doğrula.** Kod doğru olabilir ama dağıtım gecikmiş olabilir; çektiğin HTML'i göster.
- **Test verisi kanıttan sonra silinir.**

## Deploy raporu — dördü ayrı satır

```
commit             <sha>
push               ✓
GitHub'da görünüyor ✓  (origin/main = <sha>)
canlıda doğrulandı  <ne ölçüldü>
```

**Vercel CLI asla çalıştırılmaz.** Dağıtımı git push tetikler.

## Veritabanı

Proje: **`halyhtowppivuwpdserp`** (`.env.local` → `NEXT_PUBLIC_SUPABASE_URL`).

**Şu anki düzen: DDL'i sen çalıştırmazsın.** `docs/<konu>/NN-*.sql` olarak hazırla, BB Supabase SQL Editor'de çalıştırır.

Sebep: hazır MCP bağlayıcısı (`claude.ai Supabase`) başka bir hesaba bağlı ve yalnız `uqxterycuogrncaxprne` (karpanel-prod) projesini görüyor; bu projeye `execute_sql` denemesi *"You do not have permission"* döndürüyor.

`.mcp.json` içinde doğru projeye bakan `supabase-nbsteelora` tanımı **hazır** ama `SUPABASE_ACCESS_TOKEN` ortam değişkeni tanımlanana ve sunucu onaylanana kadar bağlanmaz. Bağlandığında bu bölüm güncellenir ve `docs/*.sql` adımı kalkar.

> ⚠ **Yanlış proje tehlikesi:** `/Users/bedir/Projects/.mcp.json` (üst klasör) `supabase` adıyla **karpanel-prod**'a bakan bir sunucu tanımlıyor. Bu proje için ondan yazma yapma — `supabase-nbsteelora` dışında bir Supabase MCP'si görürsen kullanma.

## Hata gözcüsü

Vercel Hobby'de çalıştırma logu yok; Sentry tek gerçek gözcü.

- Beklenmeyen istisnalar → Sentry (`src/instrumentation.ts`, `sentry.*.config.ts`).
- Bizim yakaladığımız dört kritik olay → hem Sentry hem BB'ye mail (`src/lib/izleme/uyari.ts`).
- **Kişisel veri Sentry'ye gitmez.** Süzgeç: `src/lib/izleme/gizlilik.ts` — e-posta, adres, telefon, kart, IBAN silinir; `user` alanı tamamen düşer. Sipariş numarası ve tutar korunur (hata ayıklama için).
- Süzgeci değiştirdiysen testi çalıştır: `npx tsx src/lib/izleme/__testler__/gizlilik.test.mts`.
- DSN yoksa SDK sessizce kapalıdır — yerelde ve önizlemede olay gitmez.

## Başvurulacak belgeler

| konu | dosya |
|---|---|
| marka sesi | [docs/marka-sesi.md](docs/marka-sesi.md) |
| kampanya motoru | [docs/kampanya-motoru/](docs/kampanya-motoru/) |
| stok senkronu | [docs/stok-senkronu/](docs/stok-senkronu/) |
| güvenlik DDL | [docs/guvenlik/](docs/guvenlik/) |
| yedekleme | [docs/yedekleme.md](docs/yedekleme.md) |
| Supabase taşıma | [docs/supabase-tasima/](docs/supabase-tasima/) |
| mail şablonları | [docs/auth-mail-sablonlari/](docs/auth-mail-sablonlari/) |
