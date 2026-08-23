import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * 3D Secure ara sayfasının imzası (Faz 27 güvenlik denetimi).
 *
 * KUSUR: /api/3ds-redirect, POST gövdesinden gelen base64 HTML'i olduğu gibi
 * `text/html` olarak döndürüyordu. Yani HERKES kendi HTML'ini gönderip bizim
 * alan adımızda çalıştırabilirdi. İki somut sonucu olurdu:
 *   - Kimlik avı: nbsteelora.com adresinde sahte bir "kart bilgilerinizi
 *     girin" sayfası; adres çubuğu gerçek alan adını gösterirdi.
 *   - Oturum çalma: kendi kaynağımızda çalışan bir script, tarayıcıdaki
 *     Supabase oturum çerezine ve yerel depolamaya erişebilirdi.
 *
 * ÇÖZÜM: içerik SUNUCUDA imzalanır, ara sayfa imzayı doğrulamadan hiçbir şey
 * basmaz. İmza anahtarı iyzico gizli anahtarından türetilir — yeni bir ortam
 * değişkeni gerekmez, dolayısıyla dağıtım sırasında unutulma riski yok.
 *
 * İmza tek kullanımlık DEĞİLDİR; süreye bağlıdır. Amaç tekrar saldırısını
 * tamamen bitirmek değil, İÇERİĞİN BİZDEN ÇIKTIĞINI kanıtlamak: saldırgan
 * kendi HTML'ini imzalatamaz, ele geçirdiği eski bir 3DS sayfasını tekrar
 * açması ise ona bir şey kazandırmaz (o sayfa iyzico'ya gider ve süresi dolar).
 */

const AMAC = 'nb-3ds-redirect-v1'
/** İmzanın geçerlilik süresi — 3DS akışı dakikalar sürer, 15 dk fazlasıyla yeter. */
const OMUR_MS = 15 * 60 * 1000

function anahtar(): string | null {
  const gizli = process.env.IYZICO_SECRET_KEY?.trim()
  if (!gizli) return null
  // Ödeme anahtarını doğrudan kullanmak yerine amaca özel bir alt anahtar:
  // imza sızsa bile ödeme anahtarı geri hesaplanamaz.
  return createHmac('sha256', gizli).update(AMAC).digest('hex')
}

function hesapla(base64Html: string, zaman: number, k: string): string {
  return createHmac('sha256', k).update(`${zaman}.${base64Html}`).digest('hex')
}

/** `zaman.imza` biçiminde bir jeton üretir. Anahtar yoksa null. */
export function redirectImzala(base64Html: string): string | null {
  const k = anahtar()
  if (!k) return null
  const zaman = Date.now()
  return `${zaman}.${hesapla(base64Html, zaman, k)}`
}

export type ImzaSonucu = { gecerli: true } | { gecerli: false; sebep: string }

/** Jetonu doğrular: biçim, süre ve imza. */
export function redirectDogrula(base64Html: string, jeton: string | null): ImzaSonucu {
  const k = anahtar()
  if (!k) return { gecerli: false, sebep: 'imza anahtarı yapılandırılmamış' }
  if (!jeton) return { gecerli: false, sebep: 'imza yok' }

  const ayrac = jeton.indexOf('.')
  if (ayrac <= 0) return { gecerli: false, sebep: 'imza biçimi geçersiz' }

  const zaman = Number(jeton.slice(0, ayrac))
  const imza = jeton.slice(ayrac + 1)
  if (!Number.isFinite(zaman)) return { gecerli: false, sebep: 'imza biçimi geçersiz' }

  const yas = Date.now() - zaman
  // İleri tarihli damga da reddedilir (saat oynatma denemesi).
  if (yas < -60_000 || yas > OMUR_MS) return { gecerli: false, sebep: 'imzanın süresi dolmuş' }

  const beklenen = hesapla(base64Html, zaman, k)
  const a = Buffer.from(imza, 'utf8')
  const b = Buffer.from(beklenen, 'utf8')
  if (a.length !== b.length) return { gecerli: false, sebep: 'imza eşleşmedi' }
  return timingSafeEqual(a, b) ? { gecerli: true } : { gecerli: false, sebep: 'imza eşleşmedi' }
}
