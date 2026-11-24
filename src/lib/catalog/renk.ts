/**
 * Renk süzgeci (24 Kas 2026 tasarım denetimi).
 *
 * Kaynak Trendyol'un "Renk" özelliğidir (products.trendyol_color; yalnız
 * senkron yazar — docs/renk/01-renk-alani.sql). Rengi ürün adından çıkarmak
 * işe yaramıyordu: gümüş renkli ürünlerin çoğunun adında renk geçmiyor.
 *
 * Ölçüm (KarPanel verisi, 24 Kas 2026, satıştaki 506 satır): Altın 245,
 * Gümüş 148, tek harf 94, diğer renkler 19 (Beyaz, Bordo, Pembe, Siyah…).
 * "Tek harf" harf kolyeleri ve harf küpeleridir: Trendyol'da harfler "Renk"
 * seçeneği olarak açılmış, alan rengi değil harfi taşıyor. Bu ürünlerin
 * 94'ünün de adında renk açıkça yazıyor ("Gold Renk" / "Gümüş Renk"); yalnız
 * bu durumda renk addan okunur.
 *
 * Etiketler "altın rengi / gümüş rengi": malzeme değil RENK. Ürünler altın ya
 * da gümüş değildir; süzgeç bunu ima etmemeli.
 */
export type RenkGrubu = 'altin' | 'gumus' | 'diger'

export const RENK_SUZGECI: { value: RenkGrubu; label: string }[] = [
  { value: 'altin', label: 'Altın rengi' },
  { value: 'gumus', label: 'Gümüş rengi' },
  { value: 'diger', label: 'Diğer renkler' },
]

const kucuk = (metin: string) => metin.trim().toLocaleLowerCase('tr')

/** Trendyol'dan gelen rengi yazılacak hâle getirir; boşsa null. */
export function renkTemizle(deger: unknown): string | null {
  if (deger === null || deger === undefined) return null
  const metin = String(deger).trim().slice(0, 40)
  return metin.length > 0 ? metin : null
}

/** Addaki AÇIK renk beyanı: "Gold Renk", "Altın Renk", "Gümüş Renk", "Silver Renk". */
function addanRenk(ad: string | null | undefined): RenkGrubu | null {
  const a = kucuk(ad ?? '')
  if (/(^|\s)(gold|altın)\s+renk/.test(a)) return 'altin'
  if (/(^|\s)(gümüş|silver)\s+renk/.test(a)) return 'gumus'
  return null
}

/**
 * Trendyol rengi → süzgeç grubu. Renk boşsa ya da harf taşıyıp adda renk
 * yazmıyorsa null döner: ürün hiçbir renk seçeneğinde görünmez, yanlış gruba
 * da düşmez.
 */
export function renkGrubu(trendyolRengi: string | null | undefined, trendyolAdi?: string | null): RenkGrubu | null {
  const r = kucuk(trendyolRengi ?? '')
  if (!r) return null
  if (r === 'altın' || r === 'gold') return 'altin'
  if (r === 'gümüş' || r === 'silver') return 'gumus'
  // Tek ya da iki karakter: harf seçeneği (A, B, Ç…), renk değil.
  if (r.length <= 2) return addanRenk(trendyolAdi)
  return 'diger'
}

/** Listede gerçekten bulunan renk grupları; tek grup varsa süzgeç basılmaz. */
export function renkSecenekleri(
  urunler: { id: string }[],
  harita: ReadonlyMap<string, RenkGrubu>
): { value: string; label: string }[] {
  const bulunan = new Set<RenkGrubu>()
  for (const u of urunler) {
    const grup = harita.get(u.id)
    if (grup) bulunan.add(grup)
  }
  const secenekler = RENK_SUZGECI.filter((r) => bulunan.has(r.value))
  return secenekler.length > 1 ? secenekler.map((r) => ({ value: r.value, label: r.label })) : []
}

/**
 * Parametreye göre süzer. Bilinmeyen değerde ya da renk verisi henüz yokken
 * (kolon dolmamış) liste değişmez — eski bir bağlantı boş sayfa açmaz.
 */
export function renkeGoreSuz<T extends { id: string }>(
  urunler: T[],
  harita: ReadonlyMap<string, RenkGrubu>,
  deger: string | undefined
): T[] {
  const secili = RENK_SUZGECI.find((r) => r.value === deger)
  if (!secili || harita.size === 0) return urunler
  return urunler.filter((u) => harita.get(u.id) === secili.value)
}
