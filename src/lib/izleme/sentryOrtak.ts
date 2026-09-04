import type { init as SentryInit } from '@sentry/nextjs'
import { olayiTemizle } from './gizlilik'

/**
 * Üç çalışma zamanının (sunucu, istemci, edge) PAYLAŞTIĞI Sentry ayarları.
 *
 * Ayarlar üç dosyada tekrarlanırsa biri güncellenip diğeri unutulur ve
 * gizlilik süzgeci sessizce bir çalışma zamanında devre dışı kalır.
 */
export const SENTRY_ORTAK: Parameters<typeof SentryInit>[0] = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Kişisel veri Sentry'ye HİÇ gitmez: IP, çerez ve kullanıcı kimliği dahil.
  // Varsayılana güvenilmez, açıkça kapatılır.
  sendDefaultPii: false,

  // Ücretsiz katman ayda 5.000 hata alıyor. Hata örneklemesi YAPILMAZ —
  // kaçırdığımız hata işe yaramaz; hacim sorun olursa gürültülü olay
  // Sentry panelinden susturulur.
  sampleRate: 1,
  // İzleme (performans) KAPALI: kotayı hata dışı olaylarla doldurmanın
  // anlamı yok ve her işlem ek istek demek.
  tracesSampleRate: 0,

  // DSN yoksa (yerel geliştirme, önizleme) SDK sessizce devre dışı kalır.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // Son savunma hattı: giden her olay ve her iz kırıntısı temizlikten geçer.
  beforeSend: (olay) => olayiTemizle(olay),
  beforeBreadcrumb: (kirinti) => olayiTemizle(kirinti),

  ignoreErrors: [
    // Tarayıcı eklentileri ve ağ kopmaları — bizim hatamız değil, kotayı yer.
    'ResizeObserver loop',
    'Non-Error promise rejection captured',
    'AbortError',
    'NetworkError when attempting to fetch resource',
    'Failed to fetch',
  ],
}
