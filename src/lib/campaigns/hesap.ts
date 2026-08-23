/**
 * İndirim hesabının SAF çekirdeği (Faz 17).
 *
 * Bu dosya veritabanına, ağa ve React'e dokunmaz: sepet kalemleri + kampanya
 * tanımları girer, indirim çıkar. Böylece aynı fonksiyon üç yerden çağrılır ve
 * sonuç asla ayrışmaz:
 *   - /api/payment/initialize (karttan çekilen tutarın kaynağı)
 *   - /api/discount/auto-apply (sepet ve ödeme ekranının gördüğü tutar)
 *   - panel canlı önizleme
 * Faz 15'te bulunan kusur (ekranda %40, sunucuda %40 ama kuralda %30) tam da
 * hesabın iki yerde ayrı yazılmasından çıkmıştı.
 */

/** Kampanyanın hangi kalemlere dokunduğu. */
/**
 * Kampanya kapsamı.
 *
 * Faz 22'de iki yeni kapsam eklendi:
 *  · 'stok'          — stoğu bir eşiğin altında kalan ürünler (stok sonu)
 *  · 'fiyat_araligi' — birim fiyatı verilen aralıkta olan ürünler
 *
 * İkisi de ANLIK hesaplanır: kapsam üyeliği sepetteki kalemin O ANKİ stok ve
 * fiyat değerinden çıkar, önceden dondurulmuş bir ürün listesi tutulmaz.
 * Stok değişince kapsam kendiliğinden güncellenir.
 */
export type Kapsam = 'sepet' | 'kategori' | 'koleksiyon' | 'urun' | 'stok' | 'fiyat_araligi'

export type KampanyaTipi =
  | 'sepet_yuzde' // tüm sepete yüzde
  | 'sepet_sabit' // tüm sepete sabit tutar
  | 'kapsam_yuzde' // kapsam içindeki kalemlere yüzde
  | 'kapsam_sabit' // kapsam içindeki kalemlere sabit tutar
  | 'x_al_y_ode' // kapsam içinde en ucuzlar bedava
  | 'kademeli' // sepet tutarına göre eşikli yüzde
  | 'ucretsiz_kargo'

export type SepetKalemi = {
  productId: string
  /** Ürün adı — panel önizlemesi ve mesajlar için. */
  ad?: string
  /** Birim fiyat (indirimsiz). */
  fiyat: number
  adet: number
  /** products.trendyol_category — kategori kapsamı bunun üzerinden eşleşir. */
  kategori?: string | null
  /** Ürünün ait olduğu koleksiyon slug'ları. */
  koleksiyonlar?: string[]
  barkod?: string | null
  /** Anlık stok — 'stok' kapsamı bunun üzerinden eşleşir (Faz 22). */
  stok?: number | null
}

export type HesapKampanyasi = {
  id: string
  ad: string
  tip: KampanyaTipi
  kapsam: Kapsam
  /** Kapsam 'kategori' ise kategori desenleri, 'koleksiyon' ise slug'lar, 'urun' ise ürün kimlikleri/barkodlar. */
  hedefler: string[]
  /** Kapsam 'stok': stoğu bu değer ve altında olan ürünler (Faz 22). */
  stokAzami?: number | null
  /** Kapsam 'fiyat_araligi': birim fiyat alt/üst sınırı (Faz 22). */
  fiyatMin?: number | null
  fiyatMax?: number | null
  /** Yüzde tiplerinde oran, sabit tiplerinde tutar; x_al_y_ode'de kullanılmaz. */
  deger: number | null
  minSepet: number
  minAdet: number
  /** x_al_y_ode: kaç alana kaç ödenir. */
  alAdet?: number | null
  odeAdet?: number | null
  /** kademeli: [{ minTutar, oran }] — sepete uyan EN YÜKSEK eşik uygulanır. */
  kademeler?: { minTutar: number; oran: number }[] | null
  /** Diğer kampanyalarla toplanabilir mi? Varsayılan hayır. */
  birlesebilir: boolean
  /** Eşitlikte hangisi önce gelsin (büyük olan önce). */
  oncelik: number
  /** Yalnız ilk alışverişte geçerli mi? */
  ilkAlisverisMi: boolean
  /** Yalnız üyelere mi? */
  sadeceUyelere: boolean
  /** Kod ile mi uygulanır (otomatik değil)? */
  koduVar: boolean
}

/** Hesap sırasında müşterinin durumu — koşullu kampanyalar için. */
export type MusteriDurumu = {
  uyeMi: boolean
  /** Daha önce teslim edilmiş siparişi var mı? (ilk alışveriş koşulu) */
  oncekiTeslimatVar: boolean
}

export type UygulananIndirim = {
  kampanyaId: string
  ad: string
  tip: KampanyaTipi
  tutar: number
  /** Kampanyanın dokunduğu kalem toplamı — kapsamlı kampanyalarda sepetten küçüktür. */
  kapsamTutari: number
  birlesebilir: boolean
}

export type HesapSonucu = {
  araToplam: number
  uygulananlar: UygulananIndirim[]
  indirimToplami: number
  /** Tavan kırpması yapıldıysa true (sepette ve panelde not gösterilir). */
  tavanUygulandi: boolean
  tavanTutari: number
  ucretsizKargo: boolean
  /** Uygulanamayan ama eşiğe yakın kampanyalar: "X₺ daha ekleyin". */
  yaklasanlar: { kampanyaId: string; ad: string; kalanTutar: number; oran: number | null }[]
  toplam: number
}

/**
 * Toplam indirim tavanı — sepet ara toplamının yüzdesi.
 * Birleşebilir kampanyalar üst üste bindiğinde marjın altına düşmemek için
 * sabit bir sınır; panelde de bu değer gösterilir.
 */
export const INDIRIM_TAVANI_ORANI = 35

/** Kuruş yuvarlaması — her tutar tek noktadan yuvarlanır. */
export function kurus(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

/** Kalemin kampanya kapsamına girip girmediği. */
export function kalemKapsamda(kalem: SepetKalemi, k: HesapKampanyasi): boolean {
  if (k.kapsam === 'sepet') return true

  // Stok kapsamı: eşik ve altı. Stok bilinmiyorsa kapsam DIŞI sayılır —
  // eksik veriyle indirim vermek, vermemekten daha kötüdür.
  if (k.kapsam === 'stok') {
    const esik = Number(k.stokAzami)
    if (!Number.isFinite(esik) || esik <= 0) return false
    // null/undefined AÇIKÇA elenir: Number(null) === 0 olduğu için sessizce
    // "stoğu 0" sayılıp kapsama giriyordu — stok bilinmiyorsa indirim yok.
    if (kalem.stok === null || kalem.stok === undefined) return false
    const stok = Number(kalem.stok)
    if (!Number.isFinite(stok)) return false
    return stok <= esik
  }

  // Fiyat aralığı: sınırlardan biri boş bırakılabilir (yalnız alt ya da yalnız üst).
  if (k.kapsam === 'fiyat_araligi') {
    const fiyat = Number(kalem.fiyat) || 0
    const alt = Number(k.fiyatMin)
    const ust = Number(k.fiyatMax)
    const altVar = Number.isFinite(alt) && alt > 0
    const ustVar = Number.isFinite(ust) && ust > 0
    if (!altVar && !ustVar) return false
    if (altVar && fiyat < alt) return false
    if (ustVar && fiyat > ust) return false
    return true
  }

  const hedefler = (k.hedefler ?? []).map((h) => h.trim().toLocaleLowerCase('tr-TR')).filter(Boolean)
  if (hedefler.length === 0) return false

  if (k.kapsam === 'kategori') {
    const kat = (kalem.kategori ?? '').toLocaleLowerCase('tr-TR')
    // Kategori hedefi desen olarak eşleşir: "kolye" → "Çelik Kolye", "Bijuteri Kolye".
    return hedefler.some((h) => kat.includes(h))
  }
  if (k.kapsam === 'koleksiyon') {
    const slugs = (kalem.koleksiyonlar ?? []).map((s) => s.toLocaleLowerCase('tr-TR'))
    return slugs.some((s) => hedefler.includes(s))
  }
  // 'urun': ürün kimliği ya da barkod eşleşmesi
  const kimlik = kalem.productId.toLocaleLowerCase('tr-TR')
  const barkod = (kalem.barkod ?? '').toLocaleLowerCase('tr-TR')
  return hedefler.includes(kimlik) || (Boolean(barkod) && hedefler.includes(barkod))
}

export function kalemToplami(kalemler: SepetKalemi[]): number {
  return kurus(kalemler.reduce((t, k) => t + (Number(k.fiyat) || 0) * (Number(k.adet) || 0), 0))
}

/** Kapsam içindeki kalemlerin toplamı. */
export function kapsamToplami(kalemler: SepetKalemi[], k: HesapKampanyasi): number {
  return kalemToplami(kalemler.filter((kalem) => kalemKapsamda(kalem, k)))
}

/** Kapsam içindeki toplam adet (minAdet koşulu ve X al Y öde için). */
function kapsamAdedi(kalemler: SepetKalemi[], k: HesapKampanyasi): number {
  return kalemler
    .filter((kalem) => kalemKapsamda(kalem, k))
    .reduce((t, kalem) => t + (Number(kalem.adet) || 0), 0)
}

/**
 * Tek bir kampanyanın ürettiği indirim.
 * Kapsamlı kampanya YALNIZ kendi kalemlerine uygulanır: kategori kampanyası
 * sepet geneline değil, o kategorinin kalem toplamına iner.
 */
export function kampanyaIndirimi(kalemler: SepetKalemi[], k: HesapKampanyasi): number {
  const kapsamTutar = kapsamToplami(kalemler, k)
  if (kapsamTutar <= 0) return 0

  switch (k.tip) {
    case 'ucretsiz_kargo':
      return 0

    case 'sepet_yuzde':
    case 'kapsam_yuzde': {
      const oran = Number(k.deger)
      if (!Number.isFinite(oran) || oran <= 0) return 0
      return kurus(Math.min((kapsamTutar * oran) / 100, kapsamTutar))
    }

    case 'sepet_sabit':
    case 'kapsam_sabit': {
      const tutar = Number(k.deger)
      if (!Number.isFinite(tutar) || tutar <= 0) return 0
      return kurus(Math.min(tutar, kapsamTutar))
    }

    case 'kademeli': {
      const kademeler = (k.kademeler ?? [])
        .filter((t) => Number.isFinite(Number(t.minTutar)) && Number(t.oran) > 0)
        .sort((a, b) => Number(b.minTutar) - Number(a.minTutar))
      // Sepet tutarına uyan EN YÜKSEK eşik.
      const uyan = kademeler.find((t) => kapsamTutar >= Number(t.minTutar))
      if (!uyan) return 0
      return kurus(Math.min((kapsamTutar * Number(uyan.oran)) / 100, kapsamTutar))
    }

    case 'x_al_y_ode': {
      const al = Number(k.alAdet)
      const ode = Number(k.odeAdet)
      if (!Number.isFinite(al) || !Number.isFinite(ode) || al <= 0 || ode <= 0 || ode >= al) return 0

      // Kapsam içindeki kalemleri adet adet aç, ucuzdan pahalıya sırala:
      // her (al) adette (al − ode) tanesi bedava, bedava olanlar EN UCUZLAR.
      const birimler: number[] = []
      for (const kalem of kalemler) {
        if (!kalemKapsamda(kalem, k)) continue
        const adet = Math.max(0, Math.floor(Number(kalem.adet) || 0))
        for (let i = 0; i < adet; i++) birimler.push(Number(kalem.fiyat) || 0)
      }
      if (birimler.length < al) return 0
      birimler.sort((a, b) => a - b)

      const grupSayisi = Math.floor(birimler.length / al)
      const bedavaAdet = grupSayisi * (al - ode)
      const bedavaToplam = birimler.slice(0, bedavaAdet).reduce((t, f) => t + f, 0)
      return kurus(Math.min(bedavaToplam, kapsamTutar))
    }

    default:
      return 0
  }
}

/** Kampanya bu sepete ve bu müşteriye uygulanabilir mi? (tarih/limit DB katmanında süzülür) */
export function kampanyaUygunMu(
  kalemler: SepetKalemi[],
  k: HesapKampanyasi,
  musteri: MusteriDurumu
): { uygun: boolean; sebep?: string; eksikTutar?: number } {
  if (k.sadeceUyelere && !musteri.uyeMi) return { uygun: false, sebep: 'Yalnız üyelere özel' }
  if (k.ilkAlisverisMi && musteri.oncekiTeslimatVar) {
    return { uygun: false, sebep: 'Yalnız ilk alışverişte geçerli' }
  }

  const araToplam = kalemToplami(kalemler)
  const minSepet = Number(k.minSepet) || 0
  if (araToplam < minSepet) {
    return { uygun: false, sebep: 'Sepet tutarı yetersiz', eksikTutar: kurus(minSepet - araToplam) }
  }

  const minAdet = Number(k.minAdet) || 0
  if (minAdet > 0 && kapsamAdedi(kalemler, k) < minAdet) {
    return { uygun: false, sebep: `En az ${minAdet} ürün gerekli` }
  }

  if (k.kapsam !== 'sepet' && kapsamToplami(kalemler, k) <= 0) {
    return { uygun: false, sebep: 'Sepette kapsama giren ürün yok' }
  }

  return { uygun: true }
}

/**
 * Sepetin nihai indirimi.
 *
 * ÇAKIŞMA KURALI:
 *   - Birleşmeye KAPALI kampanyalar kendi aralarında yarışır; yalnız en yüksek
 *     tutarlı olan uygulanır (eşitlikte öncelik alanı belirler).
 *   - Birleşmeye AÇIK kampanyalar kendi aralarında toplanır.
 *   - İki kümenin sonucundan müşteri lehine olan (büyük olan) seçilir; kapalı
 *     bir kampanya seçildiğinde tanımı gereği yanına başka kampanya eklenmez.
 *   - Sonuç, ara toplamın %35'ini aşarsa tavana kırpılır.
 */
export function sepetHesabi(params: {
  kalemler: SepetKalemi[]
  kampanyalar: HesapKampanyasi[]
  musteri?: MusteriDurumu
  kargoTutari?: number
}): HesapSonucu {
  const kalemler = params.kalemler ?? []
  const musteri = params.musteri ?? { uyeMi: false, oncekiTeslimatVar: false }
  const araToplam = kalemToplami(kalemler)
  const kargo = kurus(params.kargoTutari ?? 0)
  const tavanTutari = kurus((araToplam * INDIRIM_TAVANI_ORANI) / 100)

  const adaylar: UygulananIndirim[] = []
  const yaklasanlar: HesapSonucu['yaklasanlar'] = []
  let ucretsizKargo = false

  for (const k of params.kampanyalar ?? []) {
    const uygunluk = kampanyaUygunMu(kalemler, k, musteri)
    if (!uygunluk.uygun) {
      // Yalnız tutar eksikliğinden kaçıranlar "yaklaşan" sayılır; müşteriye
      // "X₺ daha ekleyin" denebilmesi için.
      if (uygunluk.eksikTutar && uygunluk.eksikTutar > 0) {
        yaklasanlar.push({
          kampanyaId: k.id,
          ad: k.ad,
          kalanTutar: uygunluk.eksikTutar,
          oran: k.tip.endsWith('yuzde') ? Number(k.deger) || null : null,
        })
      }
      continue
    }

    if (k.tip === 'ucretsiz_kargo') {
      ucretsizKargo = true
      continue
    }

    const tutar = kampanyaIndirimi(kalemler, k)
    if (tutar <= 0) continue
    adaylar.push({
      kampanyaId: k.id,
      ad: k.ad,
      tip: k.tip,
      tutar,
      kapsamTutari: kapsamToplami(kalemler, k),
      birlesebilir: k.birlesebilir,
    })
  }

  const kapalilar = adaylar.filter((a) => !a.birlesebilir)
  const acikar = adaylar.filter((a) => a.birlesebilir)

  const enIyiKapali = kapalilar.reduce<UygulananIndirim | null>(
    (kazanan, aday) => (!kazanan || aday.tutar > kazanan.tutar ? aday : kazanan),
    null
  )
  const acikToplam = kurus(acikar.reduce((t, a) => t + a.tutar, 0))

  let uygulananlar: UygulananIndirim[]
  if (enIyiKapali && enIyiKapali.tutar >= acikToplam) {
    uygulananlar = [enIyiKapali]
  } else {
    uygulananlar = acikar
  }

  let indirimToplami = kurus(uygulananlar.reduce((t, a) => t + a.tutar, 0))
  let tavanUygulandi = false

  // TAVAN yalnız BİRDEN FAZLA kampanya birleştiğinde uygulanır. Tek kampanya
  // mağazanın bilinçli kararıdır: "2 al 1 öde" tanımlayan bir kampanyayı %35'e
  // kırpmak, ilan edilen kampanyayı sessizce küçültmek olurdu. Tavan, üst üste
  // binen indirimlerin marjı götürmesine karşı bir sınırdır.
  if (uygulananlar.length > 1 && indirimToplami > tavanTutari) {
    tavanUygulandi = true
    // Kırpma, kampanyalara tutarlarıyla orantılı dağıtılır; böylece sepette
    // görünen satırların toplamı gösterilen indirimle birebir tutar.
    const oran = tavanTutari / indirimToplami
    uygulananlar = uygulananlar.map((a) => ({ ...a, tutar: kurus(a.tutar * oran) }))
    // Yuvarlama farkı en büyük satıra yazılır.
    const yeniToplam = kurus(uygulananlar.reduce((t, a) => t + a.tutar, 0))
    const fark = kurus(tavanTutari - yeniToplam)
    if (fark !== 0 && uygulananlar.length > 0) {
      const enBuyuk = uygulananlar.reduce((a, b) => (a.tutar >= b.tutar ? a : b))
      enBuyuk.tutar = kurus(enBuyuk.tutar + fark)
    }
    indirimToplami = tavanTutari
  }

  indirimToplami = kurus(Math.min(indirimToplami, araToplam))
  const toplam = kurus(Math.max(0, araToplam - indirimToplami) + (ucretsizKargo ? 0 : kargo))

  return {
    araToplam,
    uygulananlar,
    indirimToplami,
    tavanUygulandi,
    tavanTutari,
    ucretsizKargo,
    yaklasanlar: yaklasanlar.sort((a, b) => a.kalanTutar - b.kalanTutar).slice(0, 3),
    toplam,
  }
}

/**
 * Vitrin görünürlük kuralı (Faz 17-B).
 *
 * Ürün kartında "üstü çizili eski fiyat + indirimli fiyat" YALNIZ kampanya
 * koşulsuz ve tüm ürünleri kapsıyorsa gösterilir. Koşullu kampanyalarda
 * (min sepet, kategori/ürün kapsamı, X al Y öde, kademeli) kartta indirimli
 * fiyat gösterilmez — yerine koşulu anlatan küçük bir rozet basılır. Aksi
 * hâlde müşterinin tek ürün alırken göreceği fiyat gerçekleşmez.
 */
export function kartFiyatiGosterilsinMi(k: HesapKampanyasi): boolean {
  if (k.koduVar) return false
  if (k.ilkAlisverisMi || k.sadeceUyelere) return false
  if (k.kapsam !== 'sepet') return false
  if ((Number(k.minSepet) || 0) > 0) return false
  if ((Number(k.minAdet) || 0) > 0) return false
  return k.tip === 'sepet_yuzde'
}

/** Koşullu kampanyalar için kısa rozet metni. */
export function kosulRozeti(k: HesapKampanyasi): string | null {
  const oran = Number(k.deger)
  const minSepet = Number(k.minSepet) || 0

  if (k.tip === 'x_al_y_ode' && k.alAdet && k.odeAdet) {
    return `${k.alAdet} al ${k.odeAdet} öde`
  }
  if (k.tip === 'kademeli') {
    const en = (k.kademeler ?? []).slice().sort((a, b) => Number(a.minTutar) - Number(b.minTutar))[0]
    return en ? `${Math.round(Number(en.minTutar))}₺ üzeri %${Math.round(Number(en.oran))}` : null
  }
  if (k.kapsam !== 'sepet' && Number.isFinite(oran) && oran > 0) {
    const hedef = (k.hedefler ?? [])[0]
    const etiket = hedef ? hedef.charAt(0).toLocaleUpperCase('tr-TR') + hedef.slice(1) : 'Seçili ürünler'
    return k.tip.endsWith('sabit') ? `${etiket}: ${oran}₺ indirim` : `${etiket}de %${Math.round(oran)}`
  }
  if (minSepet > 0 && Number.isFinite(oran) && oran > 0) {
    return `${Math.round(minSepet)}₺ üzeri %${Math.round(oran)}`
  }
  if (k.koduVar && Number.isFinite(oran) && oran > 0) {
    return `Kodla %${Math.round(oran)}`
  }
  return null
}
