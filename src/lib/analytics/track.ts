import { createServiceClient } from '@/lib/supabase/service'
import { CONSENT_COOKIE, VISITOR_COOKIE, parseConsent, katmanBAcik } from './consent'

/**
 * Olay yazımının tek kapısı (Faz 12).
 *
 * Kurallar:
 *  - visitor_id YALNIZ analitik-gelişmiş rızası varsa yazılır (Katman B).
 *  - IP saklanmaz; user-agent'tan yalnız cihaz tipi türetilir.
 *  - Bot trafiği yazılmaz.
 *  - Ateşle-unut: hata istek yolunu asla bozmaz, sessizce loglanır.
 */

export type AnalyticsEvent =
  | 'page_view'
  | 'product_view'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'favorite_add'
  | 'favorite_remove'
  | 'search'
  | 'begin_checkout'
  | 'purchase'
  | 'signup'
  | 'login'
  | 'newsletter_signup'

/**
 * İSTEMCİDEN gönderilebilen olaylar — TEK KAYNAK.
 *
 * Bu liste eskiden üç yerde ayrı ayrı yazılıydı (izle.ts, client.ts ve track
 * ucundaki IZINLI). Faz 23'te 'signup' olayının hiç yazılmadığı görüldü:
 * tip evreninde vardı ama ne ince kapıda ne de sunucu kapısında yer alıyordu,
 * yani eklense bile ilk kapıdan geri dönerdi. Sapma tekrarlamasın diye tip de
 * kapı da artık buradan türüyor.
 */
export const ISTEMCI_OLAYLARI = [
  'add_to_cart',
  'remove_from_cart',
  'favorite_add',
  'favorite_remove',
  'search',
  'begin_checkout',
  'newsletter_signup',
  'signup',
  'login',
] as const satisfies readonly AnalyticsEvent[]

export type IstemciOlayi = (typeof ISTEMCI_OLAYLARI)[number]

export type OlayGirdi = {
  event: AnalyticsEvent
  sessionId: string
  visitorId?: string | null
  /**
   * Giriş yapmış üyenin kimliği (Faz 23-B). KVKK kapısına tabidir:
   * aydınlatma metni, 13 ay saklama, hesapla birlikte silinme ve panelden
   * silme düğmesi hazır olmadan doldurulmaz.
   */
  userId?: string | null
  path?: string | null
  referrer?: string | null
  userAgent?: string | null
  device?: string | null
  productId?: string | null
  collectionSlug?: string | null
  searchQuery?: string | null
  value?: number | null
  orderId?: string | null
  meta?: Record<string, unknown> | null
}

const BOT_KALIBI =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|monitor|lighthouse|pagespeed|headless|puppeteer|playwright|curl|wget|python-requests|axios|node-fetch|vercel-screenshot|semrush|ahrefs|dataprovider|petalbot|gptbot|claudebot|ccbot/i

export function botMu(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true // UA yoksa gerçek tarayıcı sayılmaz
  return BOT_KALIBI.test(userAgent)
}

/** user-agent'tan YALNIZ cihaz tipi — parmak izi çıkarılmaz. */
export function cihazTipi(userAgent: string | null | undefined): 'mobile' | 'tablet' | 'desktop' | 'bot' {
  if (!userAgent) return 'bot'
  if (botMu(userAgent)) return 'bot'
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(userAgent)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

/** Yönlendiren adresten yalnız host; kendi alan adımız "doğrudan" sayılır. */
export function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, '')
    if (h.endsWith('nbsteelora.com') || h === 'localhost') return null
    return h.slice(0, 120)
  } catch {
    return null
  }
}

/** Sorgu dizesi ve uzunluk temizliği — yola PII sızmasın. */
export function temizYol(path: string | null | undefined): string | null {
  if (!path) return null
  const yalin = path.split('?')[0].split('#')[0]
  return yalin.slice(0, 200)
}

/**
 * `user_id` sütunu DDL çalışana kadar yok (docs/analiz/02-uye-baglantisi.sql).
 * Sütun yokken satırı olduğu gibi göndermek olayın TAMAMEN kaybolmasına yol
 * açardı; bir kez denenir, reddedilirse sütunsuz yazılır ve bir daha denenmez.
 */
let uyeSutunuVar: boolean | null = null

/**
 * Olayı yazar. Asla fırlatmaz — çağıran yer beklemek zorunda değildir.
 */
export async function olayYaz(girdi: OlayGirdi): Promise<void> {
  try {
    const device = girdi.device ?? cihazTipi(girdi.userAgent)
    if (device === 'bot') return
    if (!girdi.sessionId) return

    const supabase = createServiceClient()
    const satir: Record<string, unknown> = {
      event: girdi.event,
      session_id: girdi.sessionId.slice(0, 64),
      // Katman B yalnız rıza varsa; çağıran taraf zaten süzüyor, burada da guard.
      visitor_id: girdi.visitorId ? girdi.visitorId.slice(0, 64) : null,
      path: temizYol(girdi.path),
      referrer_host: girdi.referrer ? referrerHost(girdi.referrer) : null,
      device,
      product_id: girdi.productId || null,
      collection_slug: girdi.collectionSlug || null,
      search_query: girdi.searchQuery ? girdi.searchQuery.slice(0, 120) : null,
      value: girdi.value ?? null,
      order_id: girdi.orderId || null,
      meta: girdi.meta ?? null,
    }

    const yaz = (uyeli: boolean) =>
      supabase
        .from('analytics_events')
        .insert(uyeli && girdi.userId ? { ...satir, user_id: girdi.userId } : satir)

    let { error } = await yaz(uyeSutunuVar !== false)
    // 42703 / PGRST204: sütun yok. Olayı kaybetmemek için sütunsuz tekrar.
    if (error && girdi.userId && uyeSutunuVar === null && (error.code === '42703' || error.code === 'PGRST204')) {
      uyeSutunuVar = false
      console.warn('[analytics] user_id sütunu yok, üye bağlantısı kapalı yazılıyor')
      ;({ error } = await yaz(false))
    } else if (!error && girdi.userId && uyeSutunuVar === null) {
      uyeSutunuVar = true
    }

    if (error) {
      // purchase tekilliği (23505) beklenen bir durum — çift sayım engellendi.
      if (error.code !== '23505') {
        console.error('[analytics] olay yazılamadı:', error.message, girdi.event)
      }
    }
  } catch (e: any) {
    console.error('[analytics] beklenmeyen hata:', e?.message)
  }
}

/** İstek başlıklarından rıza durumunu ve kimlikleri çözer (sunucu tarafı). */
export function istektenKimlik(cookieHeader: string | null | undefined): {
  visitorId: string | null
  consentVar: boolean
} {
  if (!cookieHeader) return { visitorId: null, consentVar: false }
  const cerezler = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const i = c.indexOf('=')
      return i === -1 ? [c.trim(), ''] : [c.slice(0, i).trim(), c.slice(i + 1).trim()]
    })
  )
  const consent = parseConsent(cerezler[CONSENT_COOKIE])
  const acik = katmanBAcik(consent)
  return {
    visitorId: acik ? cerezler[VISITOR_COOKIE] || null : null,
    consentVar: acik,
  }
}
