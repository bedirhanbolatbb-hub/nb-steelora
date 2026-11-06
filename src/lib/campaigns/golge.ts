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

const sinir = (t: string | null, bos: number) => (t ? new Date(t).getTime() : bos)

/**
 * Aday, hedefin uygulanabileceği İLK anda yürürlükte mi?
 *
 * O an = şimdi ile hedefin başlangıcından geç olanı. Eskiden yalnız "tarih
 * aralıkları kesişiyor mu" bakılıyordu; süresi dolmuş kampanya da kesiştiği
 * için uyarı sonsuza kadar kalıyordu (Kasım 2026: 31 Ekim'de biten NB25,
 * HOSGELDIN10'u hâlâ "hiçbir sepette uygulanmıyor" diye gösteriyordu — kod
 * çalıştığı hâlde). Uyarı ŞİMDİKİ durumu anlatır; aday bitince kalkar.
 *
 * Bitiş KATI (`<`): aday tam hedefin başladığı anda bitiyorsa gölgelemez
 * (Faz 25'te HOSGELDIN10'un başlangıcı NB30'un bitişine ayarlanmıştı).
 */
function ilkAndaYururlukte(hedef: GolgeKampanyasi, aday: GolgeKampanyasi, simdi: number): boolean {
  const an = Math.max(simdi, sinir(hedef.baslangic, -Infinity))
  if (an >= sinir(hedef.bitis, Infinity)) return false
  return sinir(aday.baslangic, -Infinity) <= an && an < sinir(aday.bitis, Infinity)
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
 *  - hedefin uygulanabileceği ilk anda (şimdi ya da hedefin başlangıcı)
 *    yürürlüktedir.
 *
 * Hedef de aynı ölçüde geniş olmalı: kapsamı 'cart' ve yüzde tipinde.
 */
export function golgeDurumu(
  hedef: GolgeKampanyasi,
  hepsi: GolgeKampanyasi[],
  simdi: number = Date.now()
): GolgeSonucu {
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
    if (!ilkAndaYururlukte(hedef, aday, simdi)) continue
    return { golgeliMi: true, golgeleyenAd: aday.ad, golgeleyenId: aday.id }
  }
  return { golgeliMi: false }
}
