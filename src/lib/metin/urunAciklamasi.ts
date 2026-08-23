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

/**
 * Aynı VERİDEN birden çok anlatım (Faz 25).
 *
 * "Başka öner" tek bir açıklama döndürdüğü için hiçbir zaman başkasını
 * öneremiyordu. Varyantlar yeni BİLGİ eklemez — aynı olguları farklı sırada
 * ve farklı bağlaçla kurar. Uydurma özellik kuralı aynen geçerli: elde ne
 * varsa o yazılır.
 */
export function urunAciklamasiVaryantlari(u: UrunVerisi): string[] {
  const kategori = kategoriAdi(u.kategori)
  const malzeme = (u.malzeme ?? '').trim()
  const renk = ilkEslesme(u.baslik, RENKLER)
  const tas = ilkEslesme(u.baslik, TASLAR)
  const olcu = (u.olcu ?? '').trim()
  const bakim = (u.bakim ?? '').trim()

  const buyut = (m: string) => `${m.charAt(0).toLocaleUpperCase('tr-TR')}${m.slice(1)}`
  const detay = [tas ? `${tas} detaylı` : null, renk].filter(Boolean).join(', ')

  /** Cümleleri birleştirir, boşları atar; hiç cümle yoksa boş string. */
  const kur = (...parcalar: (string | null)[]) =>
    parcalar.filter((x): x is string => Boolean(x && x.trim())).join(' ').trim()

  const adaylar = [
    // 1) Malzeme + kategori önde (Faz 21'in özgün sırası)
    kur(
      malzeme && kategori ? `${malzeme} ${kategori}.` : malzeme ? `${malzeme}.` : kategori ? `${buyut(kategori)}.` : null,
      detay ? `${buyut(detay)}.` : null,
      olcu ? `Ölçü: ${olcu}.` : null,
      bakim || null
    ),
    // 2) Renk/taş önde — başlıkta güçlü bir görsel ipucu varsa daha doğal
    detay
      ? kur(
          `${buyut(detay)}${kategori ? ` ${kategori}` : ''}.`,
          malzeme ? `${malzeme}.` : null,
          olcu ? `Ölçü: ${olcu}.` : null,
          bakim || null
        )
      : null,
    // 3) Tek cümlede malzeme ve detay
    malzeme && detay
      ? kur(`${malzeme}, ${detay}${kategori ? ` ${kategori}` : ''}.`, olcu ? `Ölçü: ${olcu}.` : null, bakim || null)
      : null,
    // 4) Bakım notu olmadan kısa hâl
    kur(
      malzeme && kategori ? `${malzeme} ${kategori}.` : malzeme ? `${malzeme}.` : kategori ? `${buyut(kategori)}.` : null,
      detay ? `${buyut(detay)}.` : null,
      olcu ? `Ölçü: ${olcu}.` : null
    ),
    // 5) Kategori önde, malzeme niteleyici
    kategori && malzeme
      ? kur(`${buyut(kategori)} — ${malzeme}.`, detay ? `${buyut(detay)}.` : null, olcu ? `Ölçü: ${olcu}.` : null, bakim || null)
      : null,
    // 6) Ölçü öne alınmış hâl (beden varyantlı ürünlerde işe yarar)
    olcu
      ? kur(
          `${olcu} ölçüsünde${kategori ? ` ${kategori}` : ''}.`,
          malzeme ? `${malzeme}.` : null,
          detay ? `${buyut(detay)}.` : null,
          bakim || null
        )
      : null,
  ]

  // Tekilleştir: veri seyrekse birkaç varyant aynı cümleye düşebilir.
  const gorulen = new Set<string>()
  const sonuc: string[] = []
  for (const a of adaylar) {
    if (!a) continue
    if (gorulen.has(a)) continue
    gorulen.add(a)
    sonuc.push(a)
  }
  return sonuc
}
