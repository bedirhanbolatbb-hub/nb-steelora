/**
 * Ürün açıklaması üreteci (Faz 21).
 *
 * KURAL: yalnız VERİDE OLAN yazılır. Özellik uydurulmaz — "zarif", "şık",
 * "kaliteli" gibi kanıtlanamaz sıfatlar kullanılmaz. Elde veri yoksa cümle
 * kısalır; boş kalması, yanlış olmasından iyidir (docs/marka-sesi.md).
 *
 * Renk ve taş bilgisi ürünün KENDİ BAŞLIĞINDAN okunur — başlık da veridir,
 * uydurma değildir. Başlıkta geçmiyorsa yazılmaz.
 */

export type UrunVerisi = {
  /**
   * Renk/taş TESPİTİ için kullanılan başlık — en zengin olanı verin.
   * Panel adları kısaltılmış oluyor ("Yeşil Küpe"); pazaryeri başlığı
   * ("Yeşil Taş Detaylı Zirkon Taşlı Gold Renk Küpe") çok daha fazla
   * bilgi taşıyor ve o da veridir, uydurma değildir.
   */
  baslik: string
  kategori?: string | null
  /** materialLabel() çıktısı: "316L Paslanmaz Çelik" gibi. */
  malzeme?: string | null
  /** Bakım cümlesi — materialCare() çıktısı. */
  bakim?: string | null
  /** Varsa ölçü/beden etiketi. */
  olcu?: string | null
}

const RENKLER: [RegExp, string][] = [
  [/rose\s?gold|roze/i, 'rose gold renk'],
  [/\bgold\b|altın renk|altin renk/i, 'gold renk'],
  [/\bsilver\b|gümüş renk|gumus renk/i, 'silver renk'],
  [/\bsiyah\b/i, 'siyah'],
  [/\bbeyaz\b/i, 'beyaz'],
  [/\byeşil\b|\byesil\b/i, 'yeşil'],
  [/\bmavi\b/i, 'mavi'],
  [/\bpembe\b/i, 'pembe'],
  [/\bmor\b/i, 'mor'],
  [/\bkırmızı\b|\bkirmizi\b/i, 'kırmızı'],
]

const TASLAR: [RegExp, string][] = [
  [/zirkon/i, 'zirkon taş'],
  [/\binci\b/i, 'inci'],
  [/boncuk/i, 'boncuk'],
  [/mineli|mine\b/i, 'mine'],
  [/sedef/i, 'sedef'],
  [/taşlı|tasli/i, 'taş'],
]

function ilkEslesme(baslik: string, tablo: [RegExp, string][]): string | null {
  for (const [desen, ad] of tablo) if (desen.test(baslik)) return ad
  return null
}

/** Kategoriyi tekil, küçük harfli bir isme indirger: "Çelik Kolye" → "kolye". */
function kategoriAdi(kategori: string | null | undefined): string | null {
  const k = (kategori ?? '').trim()
  if (!k) return null
  const son = k.split(/\s+/).pop() ?? k
  return son.toLocaleLowerCase('tr-TR')
}

/**
 * 1–3 cümlelik açıklama. Hiç veri yoksa boş string döner ve çağıran taraf
 * hiçbir şey basmaz.
 */
export function urunAciklamasiUret(u: UrunVerisi): string {
  const cumleler: string[] = []
  const kategori = kategoriAdi(u.kategori)
  const malzeme = (u.malzeme ?? '').trim()

  // 1. cümle: malzeme + kategori
  if (malzeme && kategori) cumleler.push(`${malzeme} ${kategori}.`)
  else if (malzeme) cumleler.push(`${malzeme}.`)
  else if (kategori) cumleler.push(`${kategori.charAt(0).toLocaleUpperCase('tr-TR')}${kategori.slice(1)}.`)

  // 2. cümle: renk ve taş — yalnız başlıkta geçiyorsa
  const renk = ilkEslesme(u.baslik, RENKLER)
  const tas = ilkEslesme(u.baslik, TASLAR)
  const detay = [tas ? `${tas} detaylı` : null, renk].filter(Boolean).join(', ')
  if (detay) cumleler.push(`${detay.charAt(0).toLocaleUpperCase('tr-TR')}${detay.slice(1)}.`)

  // 3. cümle: ölçü
  if ((u.olcu ?? '').trim()) cumleler.push(`Ölçü: ${u.olcu!.trim()}.`)

  // 4. cümle: bakım — malzemeden türer, uydurma değil
  if ((u.bakim ?? '').trim()) cumleler.push(u.bakim!.trim())

  return cumleler.join(' ').trim()
}
