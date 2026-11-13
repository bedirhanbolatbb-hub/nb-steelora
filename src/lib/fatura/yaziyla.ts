/**
 * Tutarı yazıya çevirir — e-Arşiv faturasının not satırı için.
 *
 * Biçim BB'nin elle kestiği faturalardan birebir alındı (Kas 2026):
 *   normal satış  (GIB2026000000003): "YALNIZ: DÖRT YÜZ KIRK ALTI TÜRK LİRASI SEKSEN ALTI KURUŞ"
 *   mikro ihracat (GIB2026000000001): "Toplam Tutar: DÖRT YÜZ DOKSAN BEŞ Türk Lirası OTUZ YEDİ kuruş."
 * Kelimeler ayrı yazılır; "BİR YÜZ" ve "BİR BİN" denmez, "BİR MİLYON" denir.
 *
 * Dışa bağımlılığı yok: saf fonksiyonlar, tek başına denenebilir.
 */

const BIRLER = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ']
const ONLAR = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN']
const BASAMAKLAR = ['', 'BİN', 'MİLYON', 'MİLYAR']

function ucHane(n: number): string {
  const yuz = Math.floor(n / 100)
  const on = Math.floor((n % 100) / 10)
  const bir = n % 10
  return [yuz ? (yuz > 1 ? `${BIRLER[yuz]} YÜZ` : 'YÜZ') : '', ONLAR[on], BIRLER[bir]]
    .filter(Boolean)
    .join(' ')
}

/** Negatif olmayan tam sayıyı büyük harfle yazıya çevirir: 446 → "DÖRT YÜZ KIRK ALTI". */
export function sayiyiYaz(sayi: number): string {
  if (!Number.isInteger(sayi) || sayi < 0 || sayi >= 1e12) {
    throw new Error(`sayiyiYaz: 0 ile 999 milyar arası tam sayı bekleniyordu (${sayi})`)
  }
  if (sayi === 0) return 'SIFIR'
  const parcalar: string[] = []
  let kalan = sayi
  for (let basamak = 0; kalan > 0; basamak++, kalan = Math.floor(kalan / 1000)) {
    const grup = kalan % 1000
    if (!grup) continue
    parcalar.unshift(
      basamak === 1 && grup === 1 ? 'BİN' : [ucHane(grup), BASAMAKLAR[basamak]].filter(Boolean).join(' ')
    )
  }
  return parcalar.join(' ')
}

/** Kuruş hassasiyetinde böler; kayan nokta artığı (446.86 * 100 = 44686.000…01) taşmaz. */
export function liraKurus(tutar: number): { lira: number; kurus: number } {
  const toplamKurus = Math.round(tutar * 100)
  return { lira: Math.floor(toplamKurus / 100), kurus: toplamKurus % 100 }
}

/** Normal satış notunun ilk satırı. */
export function yalnizSatiri(tutar: number): string {
  const { lira, kurus } = liraKurus(tutar)
  return `YALNIZ: ${sayiyiYaz(lira)} TÜRK LİRASI${kurus ? ` ${sayiyiYaz(kurus)} KURUŞ` : ''}`
}

/** Mikro ihracat notunun son satırı. */
export function toplamTutarSatiri(tutar: number): string {
  const { lira, kurus } = liraKurus(tutar)
  return `Toplam Tutar: ${sayiyiYaz(lira)} Türk Lirası${kurus ? ` ${sayiyiYaz(kurus)} kuruş` : ''}.`
}
