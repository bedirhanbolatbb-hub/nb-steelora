import * as Sentry from '@sentry/nextjs'

/**
 * Sunucu ve edge çalışma zamanlarında Sentry'yi başlatır.
 *
 * Vercel Hobby'de çalıştırma logu tutulmuyor: bir sipariş 500 alırsa bunu
 * ancak müşteri söylerse öğreniyorduk. lib/izleme/uyari.ts yalnız BİZİM
 * yakaladığımız dört kritik olayı mailliyor; beklenmeyen istisnalar hiçbir
 * yere düşmüyordu. Sentry o boşluğu kapatır.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

/** Sunucu bileşeni / route handler içinde patlayan istekleri yakalar. */
export const onRequestError = Sentry.captureRequestError
