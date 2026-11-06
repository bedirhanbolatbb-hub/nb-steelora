/**
 * Vitrin kadrajı ayarı (Faz 35) — site_content'ten okunur, sıfır DDL.
 *
 *   vitrin_kadraj         'acik' | 'kapali'   (anahtar yoksa açık)
 *   vitrin_kadraj_kapali  JSON ürün kimliği listesi — bu ürünlerde kart
 *                         görseli eskisi gibi ortadan kırpılır
 *
 * Panel karşılığı: ürün detayındaki "Vitrin kadrajı" kartı (ürün başına) ve
 * Kürasyon ekranındaki genel anahtar.
 */
export const KADRAJ_ANAHTARI = 'vitrin_kadraj'
export const KADRAJ_KAPALI_ANAHTARI = 'vitrin_kadraj_kapali'

export type KadrajAyari = { acik: boolean; kapaliIdler: string[] }

export function kapaliListesiniCoz(deger: string | null | undefined): string[] {
  if (!deger) return []
  try {
    const liste = JSON.parse(deger)
    return Array.isArray(liste) ? liste.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function kadrajAyariniOku(content: Record<string, string> | null | undefined): KadrajAyari {
  const c = content ?? {}
  return {
    acik: (c[KADRAJ_ANAHTARI] ?? 'acik').trim() !== 'kapali',
    kapaliIdler: kapaliListesiniCoz(c[KADRAJ_KAPALI_ANAHTARI]),
  }
}
