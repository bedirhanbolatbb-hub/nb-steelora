import * as Sentry from '@sentry/nextjs'
import { SENTRY_ORTAK } from '@/lib/izleme/sentryOrtak'

/**
 * Tarayıcı tarafı. Oturum tekrarı (replay) ve performans izleme AÇILMADI:
 * ikisi de ekranı ve kişisel veriyi Sentry'ye taşır, ayrıca istemciye ciddi
 * JS yükler — animasyon bütçesi kuralıyla (sayfa başına +5 KB) çelişir.
 */
Sentry.init(SENTRY_ORTAK)

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
