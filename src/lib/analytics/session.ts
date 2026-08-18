import { createHash } from 'crypto'
import { cihazTipi } from './track'

/**
 * Çerezsiz oturum kimliği (Katman A — Faz 12, Faz 15'te onarıldı).
 *
 *   session_id = sha256(günlük tuz | ip | ua özeti | dil)
 *
 * IP hiçbir yerde SAKLANMAZ, yalnız karma girdisi olarak kullanılıp atılır.
 * Tuz her gün değiştiği için kimlik ertesi gün geçersizleşir — kalıcı kimlik
 * ya da kişi profili oluşmaz, çerez yazılmaz. (Plausible/Fathom deseni.)
 *
 * FAZ 15 — ÖLÇÜLEN KUSUR: tuz `randomBytes` ile SÜREÇ BAŞINA üretiliyordu.
 * Vercel'de her sunucusuz örnek ayrı bir süreçtir; aynı tarayıcıdan gelen
 * ardışık istekler farklı örneklere düştüğü için her birinde başka bir tuz —
 * dolayısıyla başka bir session_id — çıkıyordu. Ölçüm: tek tarayıcıdan 10
 * sayfalık gezinti 4 ayrı oturum üretti (canlı veride 97 olay / 63 oturum).
 * Tuz artık rastgele değil, tüm örneklerde AYNI olan bir sunucu sırrından
 * türetiliyor; sır karmanın içinde kalır, dışarı hiçbir biçimde verilmez.
 */

/** Uyarı bir kez basılır; her istekte log şişirmenin anlamı yok. */
const uyariDurumu = globalThis as unknown as { __nbTuzUyarisi?: boolean }

/**
 * Günlük tuz — yalnız ANALYTICS_SALT'tan üretilir.
 *
 * Faz 15'te rastgele tuz kaldırılıp "yoksa başka bir sunucu sırrına düş"
 * çözümü konmuştu; çalışıyor ama örtük bir sözleşme. Faz 17'de tuz ZORUNLU
 * hâle getirildi: değişken yoksa kimlik üretilmez, ölçüm sessizce atlanır ve
 * tek satır uyarı düşülür. Böylece "tuz sandığımız yerden gelmiyor" durumu
 * sessizce şişmiş sayıya değil, görünür bir boşluğa dönüşür.
 *
 * Gün sınırı İstanbul takvimine göre: kimlik TR gecesinde değişir, gün ortası
 * kaymaz.
 */
function gunlukTuz(): string | null {
  const taban = process.env.ANALYTICS_SALT
  if (!taban || taban.trim().length < 24) {
    if (!uyariDurumu.__nbTuzUyarisi) {
      uyariDurumu.__nbTuzUyarisi = true
      console.warn(
        '[analitik] ANALYTICS_SALT tanımlı değil (ya da 24 karakterden kısa) — ' +
          'oturum kimliği üretilemediği için ölçüm atlanıyor.'
      )
    }
    return null
  }
  const bugun = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return createHash('sha256').update(`${taban.trim()}|${bugun}`).digest('hex')
}

/**
 * User-agent özeti: tarayıcı ailesi + platform + cihaz tipi.
 *
 * Sürüm numaraları dışarıda bırakılır — tarayıcı gün içinde güncellenebilir,
 * bazı istemciler (ör. istemci ipuçları kullananlar) sürümü farklı raporlar.
 * Aile/platform/cihaz üçlüsü oturumu ayırmaya yeter ve kişiyi tanımlamaz.
 */
export function uaOzeti(userAgent: string | null | undefined): string {
  const s = (userAgent || '').toLowerCase()
  if (!s) return 'yok|yok|yok'

  const aile = /edg[ea]?\//.test(s)
    ? 'edge'
    : /opr\/|opera/.test(s)
      ? 'opera'
      : /samsungbrowser/.test(s)
        ? 'samsung'
        : /firefox|fxios/.test(s)
          ? 'firefox'
          : /chrome|crios|chromium/.test(s)
            ? 'chrome'
            : /safari/.test(s)
              ? 'safari'
              : 'diger'

  const platform = /windows/.test(s)
    ? 'windows'
    : /android/.test(s)
      ? 'android'
      : /iphone|ipad|ipod/.test(s)
        ? 'ios'
        : /mac os x|macintosh/.test(s)
          ? 'mac'
          : /linux/.test(s)
            ? 'linux'
            : 'diger'

  return `${aile}|${platform}|${cihazTipi(userAgent)}`
}

/**
 * Dil tercihi — kararlı ve düşük çözünürlüklü bir sinyal. Yalnız ilk dil
 * etiketi alınır (ör. "tr-TR,tr;q=0.9,en;q=0.8" → "tr-tr"); parmak izi
 * çözünürlüğünü artırmamak için kalanı atılır.
 */
export function dilOzeti(acceptLanguage: string | null | undefined): string {
  const ilk = (acceptLanguage || '').split(',')[0]?.trim().toLowerCase()
  return ilk ? ilk.slice(0, 8) : 'yok'
}

/** Tuz yoksa `null` döner — çağıran ölçümü atlar. */
export function oturumKimligi(
  ip: string | null | undefined,
  userAgent: string | null | undefined,
  acceptLanguage?: string | null
): string | null {
  const tuz = gunlukTuz()
  if (!tuz) return null
  return createHash('sha256')
    .update(`${tuz}|${ip || 'yok'}|${uaOzeti(userAgent)}|${dilOzeti(acceptLanguage)}`)
    .digest('hex')
    .slice(0, 32)
}

/**
 * Vercel/proxy başlıklarından istemci IP'si — yalnız karma için, saklanmaz.
 *
 * x-forwarded-for zincirinin İLK değeri istemcidir; sonrakiler ara
 * vekillerdir ve istekten isteğe değişebilir. IPv6 adreslerinde yalnız /64
 * öneki (ilk dört grup) alınır: mobil ağlarda adresin son yarısı sık değişir,
 * bu da aynı cihazı yeni oturum gibi gösterirdi.
 */
export function istekIp(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for')
  const ham = xff ? xff.split(',')[0].trim() : headers.get('x-real-ip')
  if (!ham) return null
  if (ham.includes(':')) return ham.split(':').slice(0, 4).join(':')
  return ham
}
