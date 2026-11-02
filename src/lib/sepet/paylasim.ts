/**
 * Sepet paylaşımı (Faz 35).
 *
 * BB (2 Kas 2026): "sepeti başkalarıyla paylaşamıyorum — müşteri bunu
 * yapabilmeli". Sepet tarayıcıda durduğu için başka biri onu göremiyordu.
 *
 * Paylaşım bağlantısı sepetin kendisini taşır: ürün kimliği + adet. Hiçbir
 * şey kaydedilmez, kişisel veri yoktur; fiyat bağlantıda TAŞINMAZ — açan
 * kişi her ürünü o anki güncel fiyatıyla görür.
 *
 * Biçim: /sepet?paylas=<kimlik>.<adet>_<kimlik>.<adet>
 */

export const PAYLASIM_AZAMI_URUN = 30
const AZAMI_ADET = 20

export type PaylasimKalemi = { id: string; adet: number }

export function paylasimKodla(kalemler: PaylasimKalemi[]): string {
  return kalemler
    .slice(0, PAYLASIM_AZAMI_URUN)
    .map((k) => `${k.id}.${Math.min(AZAMI_ADET, Math.max(1, Math.floor(k.adet)))}`)
    .join('_')
}

/** Bozuk ya da uydurma parçalar sessizce elenir. */
export function paylasimCoz(ham: string | null | undefined): PaylasimKalemi[] {
  if (!ham) return []
  const sonuc = new Map<string, number>()
  for (const parca of ham.split('_').slice(0, PAYLASIM_AZAMI_URUN)) {
    const m = parca.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(\d{1,2})$/i)
    if (!m) continue
    const adet = Math.min(AZAMI_ADET, Math.max(1, Number(m[2])))
    sonuc.set(m[1].toLowerCase(), adet)
  }
  return [...sonuc.entries()].map(([id, adet]) => ({ id, adet }))
}
