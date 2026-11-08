import { captureException, init } from '@sentry/nextjs'
import { SENTRY_ORTAK } from './sentryOrtak'

/**
 * Tarayıcıda Sentry'yi başlatan TEK giriş (instrumentation-client bunu
 * sayfa yüklendikten sonra dinamik içe aktarır).
 *
 * Neden ayrı dosya: `import('@sentry/nextjs')` paketin TAMAMINI (oturum
 * tekrarı, geri bildirim formu, izleme…) tek parçaya koyuyordu — ölçüm
 * 8 Kas 2026: 184 KB sıkıştırılmış. Burada yalnız `init` ve
 * `captureException` adıyla içe aktarılıyor; kullanılmayan kısımlar
 * derlemede ayıklanır (75 KB).
 *
 * İzleme (performans) kapalı (tracesSampleRate 0) ama Sentry anahtarın
 * VARLIĞINA bakıp sayfa geçişi izleme ve web-vitals entegrasyonlarını yine
 * kuruyordu: PageSpeed'de başlatma tek başına ~260 ms işlemci (4× yavaş
 * telefon). Tarayıcıda anahtar çıkarılır, iki entegrasyon da eklenmez —
 * hata yakalama (GlobalHandlers, LinkedErrors, Breadcrumbs …) aynen kalır.
 */
export function sentryBaslat(bekleyen: unknown[]) {
  const ayarlar = { ...SENTRY_ORTAK }
  delete ayarlar.tracesSampleRate
  init({
    ...ayarlar,
    integrations: (varsayilan) =>
      varsayilan.filter((e) => e.name !== 'BrowserTracing' && e.name !== 'WebVitals'),
  })
  for (const hata of bekleyen) captureException(hata)
}
