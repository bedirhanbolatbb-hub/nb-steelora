/**
 * Trendyol satıcı puanı — vitrindeki güven rozetinin TEK veri kaynağı
 * (8 Kas 2026, BB: "Trendyol satıcı puanımız 9,7 … çok profesyonel ve elit
 * görünsün, müşteri cezbetsin").
 *
 * NEREDEN GELİR: Trendyol mağaza sayfasında herkese açık görünen puan (9.7) ve
 * takipçi sayısı (2,3B). Değerler panelden girilir (Site Metinleri →
 * "Trendyol satıcı puanı"). Trendyol puanı her çarşamba ~01.00'de yeniler;
 * haftalık zamanlanmış görev aynı sabah panele işler.
 *
 * KURALLAR (reklam mevzuatı + marka sesi):
 *  · Tarih her zaman rozetin yanında: "4 Kasım 2026 itibarıyla". İddia
 *    doğrulanabilir ve tarihli olmalı; uydurma ya da yuvarlanmış övgü yok.
 *  · Puan boşsa, 9,0'ın altındaysa ya da tarih 45 günden eskiyse rozet HİÇBİR
 *    yerde basılmaz — güncelleme aksarsa eski puan vitrinde kalmaz.
 *  · Google'a yıldız/puan verisi (JSON-LD AggregateRating) olarak VERİLMEZ:
 *    başka platformun puanını kendi sayfasında işaretlemek Google
 *    yönergelerine aykırı (yapısal veri cezası riski).
 *  · Trendyol logosu / rozet görseli kullanılmaz; kaynak yazıyla söylenir.
 *
 * İstemci ve sunucu birlikte içe aktarır — sunucuya özel hiçbir şey eklenmez.
 */

export const SATICI_PUANI_ANAHTARLARI = {
  puan: 'trendyol_satici_puani',
  takipci: 'trendyol_takipci',
  tarih: 'trendyol_puan_tarihi',
} as const

/** Bu puanın altında rozet basılmaz (vitrinde zayıf sinyal göstermeyiz). */
export const SATICI_PUANI_ALT_SINIR = 9
/** Tarih bundan eskiyse rozet basılmaz (gün). */
export const SATICI_PUANI_EN_ESKI_GUN = 45

export type SaticiPuani = {
  /** Vitrinde basılan puan, Trendyol'daki gibi tek ondalık: "9,7" */
  puan: string
  /** Halkanın doluluğu (0–1) — yuvarlanmamış puandan: 9,69 → 0,969 */
  oran: number
  /** "2,3 bin" — boşsa satır basılmaz */
  takipci: string | null
  /** "4 Kasım 2026" */
  tarih: string
}

export type SaticiPuaniDurumu = { veri: SaticiPuani | null; neden: string | null }

/** "9,7" · "9.69" · " 9,7 " → 9.7 / 9.69; geçersizse null. */
export function puanSayisi(ham: string | null | undefined): number | null {
  const s = (ham ?? '').trim().replace(',', '.')
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(s)) return null
  const n = Number(s)
  return n > 0 && n <= 10 ? n : null
}

/** "2,3B" · "2.3 bin" · "2300" · "2.300" → "2,3 bin" / "2.300". */
export function takipciMetni(ham: string | null | undefined): string | null {
  const s = (ham ?? '').trim()
  if (!s) return null
  const kisa = s.match(/^(\d+(?:[.,]\d+)?)\s*(b|bin|k)$/i)
  if (kisa) return `${kisa[1].replace('.', ',')} bin`
  if (/^\d{1,3}(\.\d{3})+$/.test(s) || /^\d+$/.test(s)) {
    const n = Number(s.replace(/\./g, ''))
    return n > 0 ? n.toLocaleString('tr-TR') : null
  }
  return s.slice(0, 24)
}

/** "2026-11-04" → Date (İstanbul öğlesi); biçim bozuksa null. */
export function puanTarihi(ham: string | null | undefined): Date | null {
  const s = (ham ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T12:00:00+03:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const TARIH_BICIMI = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
})

/**
 * Rozet basılacak mı, basılmayacaksa neden? Panel önizlemesi `neden`i
 * gösterir; vitrin yalnız `veri`ye bakar.
 */
export function saticiPuaniDurumu(
  c: Record<string, string | null | undefined>,
  simdi: Date = new Date()
): SaticiPuaniDurumu {
  const n = puanSayisi(c[SATICI_PUANI_ANAHTARLARI.puan])
  if (n === null) {
    return {
      veri: null,
      neden: (c[SATICI_PUANI_ANAHTARLARI.puan] ?? '').trim()
        ? 'Puan anlaşılamadı — 10 üzerinden sayı yazın (örnek: 9,7).'
        : 'Puan boş — rozet gizli.',
    }
  }
  if (n < SATICI_PUANI_ALT_SINIR) {
    return { veri: null, neden: `Puan ${SATICI_PUANI_ALT_SINIR.toFixed(1).replace('.', ',')}'ın altında — rozet gizli.` }
  }
  const t = puanTarihi(c[SATICI_PUANI_ANAHTARLARI.tarih])
  if (!t) return { veri: null, neden: 'Puanın tarihi yok — rozet tarihsiz basılmaz.' }
  const gun = (simdi.getTime() - t.getTime()) / 86_400_000
  if (gun < -1) return { veri: null, neden: 'Tarih ileri bir gün — rozet gizli.' }
  if (gun > SATICI_PUANI_EN_ESKI_GUN) {
    return { veri: null, neden: `Tarih ${SATICI_PUANI_EN_ESKI_GUN} günden eski — rozet gizli. Puanı güncelleyin.` }
  }
  return {
    veri: {
      puan: n.toFixed(1).replace('.', ','),
      oran: n / 10,
      takipci: takipciMetni(c[SATICI_PUANI_ANAHTARLARI.takipci]),
      tarih: TARIH_BICIMI.format(t),
    },
    neden: null,
  }
}

export function saticiPuaniOku(
  c: Record<string, string | null | undefined>,
  simdi?: Date
): SaticiPuani | null {
  return saticiPuaniDurumu(c, simdi).veri
}

/** Ekran okuyucu ve paylaşım için tek cümle. */
export function saticiPuaniCumlesi(v: SaticiPuani): string {
  return `Trendyol satıcı puanımız 10 üzerinden ${v.puan}${v.takipci ? `, ${v.takipci} takipçi` : ''}; ${v.tarih} itibarıyla.`
}
