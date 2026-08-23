/**
 * "Bu kampanya başka bir kampanya tarafından gölgeleniyor" tespiti (Faz 25).
 *
 * HOSGELDIN10 (%10) canlıda aylarca aktifti ama HİÇBİR sepette uygulanmadı:
 * NB30 (%30, tüm sepet, birleşmeyen) her zaman daha yüksek indirim ürettiği
 * için çakışma kuralı onu seçiyordu. Müşteriye kod verilip etkisiz kalması
 * güven kırıyor; panel bunu göstermeliydi, göstermiyordu.
 *
 * KASITLI OLARAK DAR: yalnız "hiçbir sepette kazanamaz" durumunu bildirir.
 * Kapsamlı bir kampanya (ör. seçili ürünlerde %40) sepet geneline uygulanan
 * %30'u BAZI sepetlerde yener, bazılarında yenemez — ona uyarı basmak yanlış
 * alarm olurdu. Yanlış alarm, kaçırılan uyarıdan daha maliyetlidir: paneldeki
 * her uyarı okunmayı hak etmeli.
 */

export type GolgeKampanyasi = {
  id: string
  ad: string
  /** Yüzde mi sabit tutar mı. */
  indirimTipi: 'percent' | 'fixed' | string | null
  deger: number | null
  /** 'cart' ise tüm sepete uygulanır. */
  kapsam: string | null
  birlesebilir: boolean
  /** Kod gerekiyor mu — gerekiyorsa kendiliğinden yarışa girmez. */
  koduVar: boolean
  aktif: boolean
  baslangic: string | null
  bitis: string | null
  /** Yalnız ilk alışverişte / yalnız üyelere gibi daraltıcı koşullar. */
  minSepet: number
}

/**
 * İki tarih aralığı kesişiyor mu? Boş sınır "sonsuz" demektir.
 *
 * Karşılaştırma KATI (`<`): biri tam diğerinin bittiği anda başlıyorsa
 * çakışmazlar. Faz 25'te HOSGELDIN10'un başlangıcı NB30'un bitişine
 * ayarlandı; gevşek karşılaştırma bu ikisini hâlâ "çakışıyor" sayıp yanlış
 * gölgeleme uyarısı basardı.
 */
function araliklarKesisiyorMu(a: GolgeKampanyasi, b: GolgeKampanyasi): boolean {
  const aBas = a.baslangic ? new Date(a.baslangic).getTime() : -Infinity
  const aBit = a.bitis ? new Date(a.bitis).getTime() : Infinity
  const bBas = b.baslangic ? new Date(b.baslangic).getTime() : -Infinity
  const bBit = b.bitis ? new Date(b.bitis).getTime() : Infinity
  return aBas < bBit && bBas < aBit
}

export type GolgeSonucu = { golgeliMi: boolean; golgeleyenAd?: string; golgeleyenId?: string }

/**
 * `hedef` kampanyası, `hepsi` içindeki bir başkası yüzünden hiç uygulanamaz mı?
 *
 * Gölgeleyen adayın taşıması gereken nitelikler:
 *  - kod GEREKTİRMEZ (yani her sepette kendiliğinden yarışır),
 *  - tüm sepete uygulanır (kapsam 'cart'),
 *  - sepet alt sınırı YOKTUR (varsa küçük sepetlerde hedef kazanabilir),
 *  - birleşmez (birleşebilseydi ikisi birden uygulanır, gölgeleme olmazdı),
 *  - yüzdesi hedefin yüzdesine eşit ya da ondan büyüktür,
 *  - tarih aralıkları kesişir.
 *
 * Hedef de aynı ölçüde geniş olmalı: kapsamı 'cart' ve yüzde tipinde.
 */
export function golgeDurumu(hedef: GolgeKampanyasi, hepsi: GolgeKampanyasi[]): GolgeSonucu {
  if (!hedef.aktif) return { golgeliMi: false }
  if (hedef.birlesebilir) return { golgeliMi: false }
  if (hedef.indirimTipi !== 'percent') return { golgeliMi: false }
  if ((hedef.kapsam ?? 'cart') !== 'cart') return { golgeliMi: false }
  const hedefDeger = Number(hedef.deger)
  if (!Number.isFinite(hedefDeger) || hedefDeger <= 0) return { golgeliMi: false }

  for (const aday of hepsi) {
    if (aday.id === hedef.id) continue
    if (!aday.aktif) continue
    if (aday.koduVar) continue
    if (aday.birlesebilir) continue
    if (aday.indirimTipi !== 'percent') continue
    if ((aday.kapsam ?? 'cart') !== 'cart') continue
    if (Number(aday.minSepet) > 0) continue
    const adayDeger = Number(aday.deger)
    if (!Number.isFinite(adayDeger) || adayDeger < hedefDeger) continue
    if (!araliklarKesisiyorMu(hedef, aday)) continue
    return { golgeliMi: true, golgeleyenAd: aday.ad, golgeleyenId: aday.id }
  }
  return { golgeliMi: false }
}
