/**
 * Vesile (sezon / özel gün) belirleme — Faz 21.
 *
 * Metin kütüphanesi "hangi cümleler uygun" sorusunu buna sorar. Vesile
 * bahane değildir: cümle yine kısa ve sakin kalır (bkz. docs/marka-sesi.md).
 * Uygun bir vesile yoksa metin sade kalır — uydurma bir sebep icat edilmez.
 *
 * Saf modül: import'u yok, testlerden doğrudan çağrılabilir.
 */

export type Vesile =
  | 'yilbasi'
  | 'sevgililer'
  | 'anneler_gunu'
  | 'ogretmenler_gunu'
  | 'ramazan_bayrami'
  | 'kurban_bayrami'
  | 'okula_donus'
  | 'kara_cuma'
  | 'ilkbahar'
  | 'yaz'
  | 'sonbahar'
  | 'kis'
  // Tarihten türemez, panelden seçilir:
  | 'yeni_koleksiyon'
  | 'stok_sonu'
  | 'marka_dogum_gunu'
  | 'ilk_musteri'
  | 'yok'

export const VESILE_ADLARI: Record<Vesile, string> = {
  yilbasi: 'Yılbaşı',
  sevgililer: 'Sevgililer Günü',
  anneler_gunu: 'Anneler Günü',
  ogretmenler_gunu: 'Öğretmenler Günü',
  ramazan_bayrami: 'Ramazan Bayramı',
  kurban_bayrami: 'Kurban Bayramı',
  okula_donus: 'Okula dönüş',
  kara_cuma: 'Kara Cuma',
  ilkbahar: 'İlkbahar',
  yaz: 'Yaz',
  sonbahar: 'Sonbahar',
  kis: 'Kış',
  yeni_koleksiyon: 'Yeni koleksiyon',
  stok_sonu: 'Stok sonu',
  marka_dogum_gunu: 'Marka doğum günü',
  ilk_musteri: 'İlk müşterilere özel',
  yok: 'Vesile yok (sade)',
}

/** Panelden elle seçilebilen, tarihten türemeyen vesileler. */
export const ELLE_VESILELER: Vesile[] = [
  'yeni_koleksiyon',
  'stok_sonu',
  'marka_dogum_gunu',
  'ilk_musteri',
]

/**
 * Dinî bayram tarihleri — hicri takvim kaydığı için tablo hâlinde.
 * [ay, gün] arefe/1. gün; pencere bu tarihten 10 gün öncesini kapsar.
 *
 * YILDA BİR GÖZDEN GEÇİRİN. Tabloda olmayan yıl için bayram vesilesi
 * ÜRETİLMEZ — yanlış tarihte "Bayrama özel" yazmaktansa sezona düşmek iyidir.
 */
const BAYRAMLAR: Record<number, { ramazan: [number, number]; kurban: [number, number] }> = {
  2026: { ramazan: [3, 20], kurban: [5, 27] },
  2027: { ramazan: [3, 9], kurban: [5, 16] },
  2028: { ramazan: [2, 26], kurban: [5, 5] },
}

/** İstanbul takvimine göre yıl/ay/gün. */
function parcala(d: Date): { yil: number; ay: number; gun: number } {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
  const [yil, ay, gun] = s.split('-').map(Number)
  return { yil, ay, gun }
}

/** Ayın n. belirli gününü bulur (0=pazar). */
function ninciGun(yil: number, ay: number, haftaninGunu: number, n: number): number {
  const ilk = new Date(Date.UTC(yil, ay - 1, 1))
  const kaydir = (haftaninGunu - ilk.getUTCDay() + 7) % 7
  return 1 + kaydir + (n - 1) * 7
}

function araliktaMi(gun: number, bas: number, son: number): boolean {
  return gun >= bas && gun <= son
}

/**
 * Tarihe uyan vesileler — ÖNCELİK SIRASIYLA. Özel gün varsa o öne geçer,
 * sonuncu her zaman sezondur (yani liste asla boş dönmez).
 */
export function vesileler(simdi: Date = new Date()): Vesile[] {
  const { yil, ay, gun } = parcala(simdi)
  const bulunan: Vesile[] = []

  // Yılbaşı: 20 Aralık – 5 Ocak
  if ((ay === 12 && gun >= 20) || (ay === 1 && gun <= 5)) bulunan.push('yilbasi')

  // Sevgililer: 1–14 Şubat
  if (ay === 2 && araliktaMi(gun, 1, 14)) bulunan.push('sevgililer')

  // Anneler Günü: mayısın 2. pazarı; 10 gün öncesinden itibaren
  if (ay === 5) {
    const anneler = ninciGun(yil, 5, 0, 2)
    if (araliktaMi(gun, anneler - 10, anneler)) bulunan.push('anneler_gunu')
  }

  // Öğretmenler Günü: 24 Kasım
  if (ay === 11 && araliktaMi(gun, 17, 24)) bulunan.push('ogretmenler_gunu')

  // Kara Cuma: kasımın 4. cuması; o hafta
  if (ay === 11) {
    const karaCuma = ninciGun(yil, 11, 5, 4)
    if (araliktaMi(gun, karaCuma - 3, karaCuma + 3)) bulunan.push('kara_cuma')
  }

  // Bayramlar: tablodaki tarihten 10 gün öncesi – 2 gün sonrası
  const bayram = BAYRAMLAR[yil]
  if (bayram) {
    for (const [ad, [bAy, bGun]] of [
      ['ramazan_bayrami', bayram.ramazan],
      ['kurban_bayrami', bayram.kurban],
    ] as const) {
      if (ay === bAy && araliktaMi(gun, bGun - 10, bGun + 2)) bulunan.push(ad as Vesile)
    }
  }

  // Okula dönüş: 20 Ağustos – 20 Eylül
  if ((ay === 8 && gun >= 20) || (ay === 9 && gun <= 20)) bulunan.push('okula_donus')

  // Sezon — her zaman en sonda, liste boş kalmasın
  bulunan.push(sezon(ay))
  return bulunan
}

export function sezon(ay: number): Vesile {
  if (ay >= 3 && ay <= 5) return 'ilkbahar'
  if (ay >= 6 && ay <= 8) return 'yaz'
  if (ay >= 9 && ay <= 11) return 'sonbahar'
  return 'kis'
}

/** Tarihe uyan en öncelikli vesile. */
export function oncelikliVesile(simdi: Date = new Date()): Vesile {
  return vesileler(simdi)[0]
}
