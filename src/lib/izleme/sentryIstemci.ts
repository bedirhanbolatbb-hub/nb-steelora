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
 * derlemede ayıklanır.
 */
export function sentryBaslat(bekleyen: unknown[]) {
  init(SENTRY_ORTAK)
  for (const hata of bekleyen) captureException(hata)
}
