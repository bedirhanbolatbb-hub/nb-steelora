/**
 * Türkçe ek üretimi (Faz 21).
 *
 * Otomatik metinlerde en görünür hata ekten çıkar: "Kupe kategorisinde",
 * "%25'a varan", "Bileklikde". Kütüphane ekleri elle yazmaz, buradan üretir.
 *
 * Saf modül — hiçbir import'u yok; testler ve panel önizlemesi doğrudan
 * çağırabilsin diye.
 */

const KALIN_UNLULER = 'aıou'
const INCE_UNLULER = 'eiöü'
const UNLULER = KALIN_UNLULER + INCE_UNLULER
/** Sert ünsüzler — "fıstıkçı şahap" kuralı. */
const SERT_UNSUZLER = 'fstkçşhp'

function kucult(s: string): string {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR')
}

/** Kelimenin son ünlüsü kalın mı? (yoksa kalın varsayılır) */
function sonUnluKalinMi(kelime: string): boolean {
  const k = kucult(kelime)
  for (let i = k.length - 1; i >= 0; i--) {
    if (UNLULER.includes(k[i])) return KALIN_UNLULER.includes(k[i])
  }
  return true
}

function sonHarfSertMi(kelime: string): boolean {
  const k = kucult(kelime).replace(/[^a-zçğıöşü]/g, '')
  return SERT_UNSUZLER.includes(k[k.length - 1] ?? '')
}

/** Çoğul eki: -ler / -lar */
export function cogul(ad: string): string {
  const temiz = ad.trim()
  if (!temiz) return ''
  return temiz + (sonUnluKalinMi(temiz) ? 'lar' : 'ler')
}

/** Bulunma hâli: -de / -da / -te / -ta */
export function bulunma(ad: string): string {
  const temiz = ad.trim()
  if (!temiz) return ''
  const kalin = sonUnluKalinMi(temiz)
  const sert = sonHarfSertMi(temiz)
  const ek = sert ? (kalin ? 'ta' : 'te') : kalin ? 'da' : 'de'
  return `${temiz}${ek}`
}

/**
 * "Kolyelerde", "Bilekliklerde" — çoğul + bulunma.
 * Çoğul ekinden sonra kelime hep -r ile bittiği için bulunma eki düzenli.
 */
export function cogulBulunma(ad: string): string {
  return bulunma(cogul(ad))
}

/**
 * Sayıya yönelme eki: %20'ye, %25'e, %30'a.
 * Okunuşa göre — "%25'a varan" kulak tırmalıyordu.
 */
export function yuzdeYonelme(n: number): string {
  const sayi = Math.abs(Math.round(n))
  const onlar: Record<number, string> = {
    10: "'a", 20: "'ye", 30: "'a", 40: "'a", 50: "'ye",
    60: "'a", 70: "'e", 80: "'e", 90: "'a", 100: "'e",
  }
  if (sayi % 10 === 0 && onlar[sayi]) return onlar[sayi]
  const birler: Record<number, string> = {
    1: "'e", 2: "'ye", 3: "'e", 4: "'e", 5: "'e",
    6: "'ya", 7: "'ye", 8: "'e", 9: "'a",
  }
  return birler[sayi % 10] ?? "'e"
}

/** Marka sesi: %30 (önde, bitişik). */
export function yuzde(n: number): string {
  return `%${Math.round(n)}`
}

/** Marka sesi: 1.250₺ */
export function tl(n: number): string {
  return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n)}₺`
}

/** "31 Ağustos" — yıl yalnız istenirse. */
export function tarih(d: Date | string, yil = false): string {
  return new Date(d).toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'long',
    ...(yil ? { year: 'numeric' } : {}),
  })
}

/**
 * "30 Eylül'e kadar" — kesme işaretinden sonraki ek AY ADININ son ünlüsünden
 * üretilir ("31 Ağustos'a", "30 Eylül'e"). Faz 11A-FIX · F2.
 */
export function tariheKadar(d: Date | string): string {
  const t = tarih(d)
  return `${t}${sonUnluKalinMi(t) ? "'a" : "'e"} kadar`
}
