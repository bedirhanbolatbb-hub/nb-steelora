import { panelCereziGecerliMi } from '@/lib/admin/panelOturumu'

/**
 * Kendi trafiğimizin ölçüme karışmaması (Faz 32).
 *
 * İki kaynak vardı:
 *   1. Panelden çıkıp vitrini gezmek. Panel oturumu açıkken atılan her adım
 *      "ziyaretçi" olarak yazılıyordu.
 *   2. Telefondan ya da başka bir tarayıcıdan yapılan kontroller. Bunların
 *      panel çerezi yok, o yüzden ayrı bir kapatma anahtarı gerekiyor.
 *
 * Çözüm iki kapı:
 *   · panel çerezi geçerliyse ölçüm yazılmaz (dükkân sahibi müşteri değildir),
 *   · `nb_olcme=kapali` çerezi varsa o tarayıcı hiç ölçülmez. Çerez
 *     /api/olcum-tercihi adresinden açılıp kapatılır, bir yıl yaşar.
 *
 * Ziyaretçi verisi TOPLANMAZ; bu kapı yalnız yazmayı durdurur.
 */

export const OLCUM_TERCIH_COOKIE = 'nb_olcme'
export const OLCUM_KAPALI = 'kapali'
/** Bir yıl — tarayıcı temizlenene kadar tercih korunur. */
export const OLCUM_TERCIH_MAX_AGE = 60 * 60 * 24 * 365

/** Çerez başlığından tek bir çerezi okur (ad sınırına dikkat ederek). */
function cerez(cookieHeader: string | null | undefined, ad: string): string | null {
  if (!cookieHeader) return null
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ad}=([^;]*)`))
  return m ? decodeURIComponent(m[1]).trim() : null
}

/**
 * Bu istek ölçülmeli mi?
 *
 * Kapalı başarısız OLMAZ: karar verilemezse ölçüm yapılır. Yanlışlıkla veri
 * kaybetmektense birkaç fazla satır yazmak yeğdir; asıl ayıklama zaten
 * davranışa bakan süzgeçte (makine.ts).
 */
export async function olcumeDahilMi(cookieHeader: string | null | undefined): Promise<boolean> {
  try {
    if (cerez(cookieHeader, OLCUM_TERCIH_COOKIE) === OLCUM_KAPALI) return false
    const token = cerez(cookieHeader, 'admin_token')
    if (token && (await panelCereziGecerliMi(token, process.env.ADMIN_SECRET_TOKEN?.trim()))) {
      return false
    }
    return true
  } catch {
    return true
  }
}
