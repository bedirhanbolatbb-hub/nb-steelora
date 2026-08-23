/**
 * Trafik kaynağı sınıflandırması (Faz 23-B).
 *
 * Panel "Kaynaklar" listesi ham `referrer_host` basıyordu. Canlı veride ilk
 * beş satırın ikisi trafik kaynağı DEĞİLDİ: `api.iyzipay.com` ödeme dönüşü,
 * `nbsteelora.com.` kendi sitemiz. İkisi de "dışarıdan gelen ziyaretçi" diye
 * okunuyordu. Artık iç kaynaklar ayıklanıyor ve kalanı dört gruba düşüyor.
 *
 * Liste bilerek kısa: tanımadığımız her alan adı "Diğer siteler"e düşer,
 * uydurma sınıflandırma yapılmaz.
 */

export type KaynakGrubu = 'dogrudan' | 'arama' | 'sosyal' | 'diger' | 'ic'

export const KAYNAK_ADI: Record<KaynakGrubu, string> = {
  dogrudan: 'Doğrudan',
  arama: 'Arama motoru',
  sosyal: 'Sosyal medya',
  diger: 'Diğer siteler',
  ic: 'Site içi',
}

const ARAMA = ['google.', 'bing.', 'yandex.', 'duckduckgo.', 'search.brave.', 'ecosia.', 'yahoo.']
const SOSYAL = [
  'instagram.',
  'facebook.',
  'fb.',
  'tiktok.',
  'pinterest.',
  'twitter.',
  'x.com',
  't.co',
  'youtube.',
  'linkedin.',
  'whatsapp.',
  'wa.me',
  'reddit.',
  'telegram.',
  't.me',
]
/** Ziyaretçi bize dışarıdan gelmiş sayılmaz: kendi alan adımız ve ödeme dönüşü. */
const IC = ['nbsteelora.com', 'iyzipay.com', 'iyzico.com', 'localhost', 'vercel.app']

/** Alan adının sonundaki nokta ve `www.` öneki normalize edilir. */
function sadelestir(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
}

export function kaynakGrubu(referrerHost: string | null | undefined): KaynakGrubu {
  if (!referrerHost) return 'dogrudan'
  const h = sadelestir(referrerHost)
  if (!h) return 'dogrudan'
  if (IC.some((k) => h === k || h.endsWith(`.${k}`) || h.includes(k))) return 'ic'
  // Instagram bağlantıları `l.instagram.com` üzerinden gelir; alt alan adları
  // da eşleşsin diye "içerir" değil, parça bazlı bakılır.
  const parcali = `${h}.`
  if (SOSYAL.some((k) => parcali.includes(k))) return 'sosyal'
  if (ARAMA.some((k) => parcali.includes(k))) return 'arama'
  return 'diger'
}
