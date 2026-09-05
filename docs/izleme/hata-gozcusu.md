# Hata gözcüsü (Sentry) — kurulum kaydı (5 Eylül 2026)

## Neden

Vercel Hobby planı günlük kaydı TUTMAZ. Canlıda bir hata olduğunda, müşteri
söylemezse haberimiz olmuyordu. Ödeme başlatma, sipariş yazma ve kargo
çağrısı gibi para/veri dokunan yollarda bu kabul edilemez.

## Hesap

- Sağlayıcı: Sentry — ücretsiz katman (ayda 5.000 hata).
- Kuruluş: `nb-steelora` · **veri konumu Avrupa** (`ingest.de.sentry.io`).
  Konum kuruluş açıldıktan sonra DEĞİŞTİRİLEMEZ; KVKK için Avrupa seçildi.
- Proje: `nbsteelora-web` (platform: Next.js).
- Ücretli hiçbir şey açılmadı; kota dolarsa olay düşer, para işlemez.

> Kayıt sırasında `nb-steelora-is` adlı ikinci bir boş kuruluş daha oluştu.
> Kullanılmıyor; silinmesi yalnız hesap sahibinin yapabileceği bir iş.

## Ayar

Tek bir değişken üç çalışma zamanını da (sunucu, istemci, edge) çalıştırır:

```
NEXT_PUBLIC_SENTRY_DSN
```

Vercel → nb-steelora → Environment Variables · tür **Config** (gizli değil,
DSN zaten tarayıcıya iner) · Production + Preview + Development.

Değişken yoksa SDK sessizce devre dışı kalır (`sentryOrtak.ts → enabled`),
bu yüzden yerel geliştirme etkilenmez.

## Bağlı dosyalar

| dosya | işi |
|---|---|
| `src/lib/izleme/sentryOrtak.ts` | üç çalışma zamanının paylaştığı tek ayar |
| `src/lib/izleme/gizlilik.ts` | giden her olayı temizler |
| `src/lib/security/basliklar.ts` | CSP `connect-src` kaynağını DSN'den TÜRETİR |
| `sentry.server.config.ts` / `sentry.edge.config.ts` / `src/instrumentation-client.ts` | başlatma |

## Kararlar

- **Örnekleme yok** (`sampleRate: 1`): kaçırılan hata işe yaramaz. Gürültü
  olursa olay Sentry panelinden susturulur, örnekleme açılmaz.
- **Performans izleme kapalı** (`tracesSampleRate: 0`): kotayı hata dışı
  olayla doldurmanın anlamı yok.
- **Kişisel veri gönderilmez** (`sendDefaultPii: false`) — IP, çerez ve
  kullanıcı kimliği dahil. Varsayılana güvenilmez, açıkça kapatıldı.
- CSP kaynağı elle YAZILMAZ; DSN değişirse başlık kendiliğinden düzelir.

## Doğrulama

Canlıda `content-security-policy` başlığındaki `connect-src` içinde
`https://o<kuruluş>.ingest.de.sentry.io` görünüyorsa gözcü ayakta demektir.
