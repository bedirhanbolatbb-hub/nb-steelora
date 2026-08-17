/**
 * Rıza sözleşmesi (KVKK) — istemci ve sunucu ortak tanımları (Faz 12).
 *
 * Katman A (zorunlu/anonim ölçüm) rıza gerektirmez: çerez yok, kalıcı kimlik
 * yok, kişi profili yok. Katman B (analitik-gelişmiş) yalnız açık rızayla
 * çalışır ve tek farkı kalıcı ziyaretçi kimliğidir.
 */

export const CONSENT_VERSION = '2026-08-1'

/** Rıza tercihi çerezi — birinci taraf, kategori seçimlerini taşır. */
export const CONSENT_COOKIE = 'nb_consent'
/** Katman B ziyaretçi kimliği — YALNIZ analitik-gelişmiş rızası varsa yazılır. */
export const VISITOR_COOKIE = 'nb_vid'

export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365 // 1 yıl
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 395 // 13 ay (saklama süresiyle aynı)

export type ConsentCategories = {
  /** Sitenin çalışması için gereken; kapatılamaz. */
  zorunlu: true
  /** Katman B: tekrar gelen ziyaretçi, oturumlar arası yolculuk. */
  analitik_gelismis: boolean
  /** Bu fazda hiçbir piksel yok; ileride eklenirse aynı rızaya bağlanacak. */
  pazarlama: boolean
}

export type ConsentState = {
  categories: ConsentCategories
  version: string
  /** ISO zaman damgası. */
  at: string
}

export const DEFAULT_CONSENT: ConsentCategories = {
  zorunlu: true,
  analitik_gelismis: false,
  pazarlama: false,
}

/** Çerez değerini güvenle çözer; bozuksa null. */
export function parseConsent(raw: string | undefined | null): ConsentState | null {
  if (!raw) return null
  try {
    const d = JSON.parse(decodeURIComponent(raw))
    if (!d?.categories) return null
    return {
      categories: {
        zorunlu: true,
        analitik_gelismis: Boolean(d.categories.analitik_gelismis),
        pazarlama: Boolean(d.categories.pazarlama),
      },
      version: String(d.version ?? ''),
      at: String(d.at ?? ''),
    }
  } catch {
    return null
  }
}

/**
 * Ham JSON döner — Next'in `cookies.set()` çağrısı değeri kendisi kodlar.
 * Burada ayrıca encodeURIComponent uygulamak çift kodlamaya ve çerezin
 * okunamamasına yol açıyordu.
 */
export function serializeConsent(state: ConsentState): string {
  return JSON.stringify(state)
}

/** Katman B yazılabilir mi? */
export function katmanBAcik(state: ConsentState | null): boolean {
  return Boolean(state?.categories.analitik_gelismis)
}
