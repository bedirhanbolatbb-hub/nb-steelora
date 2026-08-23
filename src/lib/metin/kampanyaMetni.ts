import { cogulBulunma, tl, yuzde, yuzdeYonelme } from './ekler'
import { VESILE_GIRISLERI } from './girisler'
import type { Vesile } from './vesile'

/**
 * Kampanya metin üreteci (Faz 21).
 *
 * BB kampanya kurarken metin yazmak istemiyor. Yapay zekâ çağrısı yok:
 * kurallı bir kütüphane, tip × kapsam × vesile kombinasyonlarından
 * alternatifler üretiyor. Ölçüt docs/marka-sesi.md.
 *
 * Saf modül — panel önizlemesi, testler ve sunucu aynı çıktıyı alsın diye.
 */

export type MetinTipi =
  | 'sepet_yuzde'
  | 'sepet_sabit'
  | 'kapsam_yuzde'
  | 'kapsam_sabit'
  | 'x_al_y_ode'
  | 'kademeli'
  | 'ucretsiz_kargo'
  | 'kupon'

export type MetinBaglami = {
  tip: MetinTipi
  /** Kategori/koleksiyon başlığı — null ise "tüm ürünlerde". */
  kapsamAdi?: string | null
  deger?: number | null
  minSepet?: number
  alAdet?: number | null
  odeAdet?: number | null
  kademeEnYuksek?: number | null
  kademeEnDusukEsik?: number | null
  kod?: string | null
  vesile?: Vesile
}

const SAYI_ADI: Record<number, string> = {
  1: 'Bir', 2: 'İki', 3: 'Üç', 4: 'Dört', 5: 'Beş', 6: 'Altı',
}
const SIRA_ADI: Record<number, string> = {
  2: 'ikincisi', 3: 'üçüncüsü', 4: 'dördüncüsü', 5: 'beşincisi', 6: 'altıncısı',
}

/** "tüm ürünlerde" / "kolyelerde" — küçük harfle başlar, açılışa eklenir. */
function kapsamIfadesi(b: MetinBaglami): string {
  const ad = (b.kapsamAdi ?? '').trim()
  if (!ad) return 'tüm ürünlerde'
  return cogulBulunma(ad).toLocaleLowerCase('tr-TR')
}

function kosulOneki(b: MetinBaglami): string {
  return b.minSepet && b.minSepet > 0 ? `${tl(b.minSepet)} üzeri ` : ''
}

/**
 * Teklif cümleleri — küçük harfle başlar (açılışla birleşecek).
 * Boş dizi dönerse metin üretilmez: yanlış bir şey yazmaktansa hiç yazma.
 */
export function teklifler(b: MetinBaglami): string[] {
  const kapsam = kapsamIfadesi(b)
  const kosul = kosulOneki(b)
  const cikti: string[] = []

  switch (b.tip) {
    case 'sepet_yuzde':
    case 'kapsam_yuzde': {
      if (!b.deger) break
      const o = yuzde(b.deger)
      cikti.push(`${kosul}${kapsam} ${o}`)
      cikti.push(`${kosul}${kapsam} ${o} indirim`)
      if (!kosul) cikti.push(`${kapsam} ${o}, sınırlı sayıda`)
      if (!b.kapsamAdi && !kosul) cikti.push(`bütün koleksiyonda ${o}`)
      break
    }
    case 'sepet_sabit':
    case 'kapsam_sabit': {
      if (!b.deger) break
      cikti.push(`${kosul}${kapsam} ${tl(b.deger)} indirim`)
      cikti.push(`${kosul}sepette ${tl(b.deger)} indirim`)
      break
    }
    case 'x_al_y_ode': {
      const al = b.alAdet ?? 0
      const ode = b.odeAdet ?? 0
      if (al <= ode || al < 2) break
      const bedava = al - ode
      if (bedava === 1 && SAYI_ADI[ode] && SIRA_ADI[al]) {
        cikti.push(`${SAYI_ADI[ode].toLocaleLowerCase('tr-TR')} alın, ${SIRA_ADI[al]} bizden`)
      }
      cikti.push(`${al} al ${ode} öde`)
      if (b.kapsamAdi) cikti.push(`${kapsam} ${al} al ${ode} öde`)
      break
    }
    case 'kademeli': {
      const en = b.kademeEnYuksek ?? 0
      if (!en) break
      const ek = yuzdeYonelme(en)
      cikti.push(`${yuzde(en)}${ek} varan indirim`)
      cikti.push(`aldıkça artan indirim, ${yuzde(en)}${ek} kadar`)
      if (b.kademeEnDusukEsik)
        cikti.push(`${tl(b.kademeEnDusukEsik)} üzeri ${yuzde(en)}${ek} varan indirim`)
      break
    }
    case 'ucretsiz_kargo':
      // Kargo zaten koşulsuz ücretsiz; bunu kampanya diye duyurmak müşteriye
      // yeni bir şey söylemez (bkz. lib/shipping.ts).
      break
    case 'kupon': {
      if (!b.deger || !b.kod) break
      cikti.push(`${kapsam} ${yuzde(b.deger)}, kod: ${b.kod}`)
      cikti.push(`${b.kod} kodu ile ${kapsam} ${yuzde(b.deger)}`)
      break
    }
  }

  return cikti
}

function bufHarf(s: string): string {
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1)
}

/** Basit, kararlı karma — aynı kampanya hep aynı sırayı görsün diye. */
function tohumla(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Diziyi tohuma göre döndürür (rastgelelik yok, tekrarlanabilir). */
function dondur<T>(dizi: T[], tohum: number): T[] {
  if (dizi.length === 0) return dizi
  const k = tohum % dizi.length
  return [...dizi.slice(k), ...dizi.slice(0, k)]
}

/**
 * Bant metni alternatifleri.
 *
 * @param harici Son kampanyalarda kullanılmış metinler — tekrar önerilmez.
 * @param tohum  Aynı kampanya için sıranın sabit kalmasını sağlar.
 * @param adet   0 ise TÜM adaylar döner (pencereyi çağıran taraf kaydırır).
 */
export function kampanyaMetinleri(
  b: MetinBaglami,
  { adet = 3, harici = [], tohum = '' }: { adet?: number; harici?: string[]; tohum?: string } = {}
): string[] {
  const teklifListesi = teklifler(b)
  if (teklifListesi.length === 0) return []

  const girisListesi = VESILE_GIRISLERI[b.vesile ?? 'yok'] ?? []
  const t = tohumla(`${tohum}|${b.tip}|${b.kapsamAdi ?? ''}|${b.vesile ?? ''}`)

  const adaylar: string[] = []
  const G = dondur(girisListesi, t)
  const T = dondur(teklifListesi, t)

  // Çapraz gezinme: ardışık öneriler HEM açılışta HEM teklifte farklılaşsın.
  // Düz iç içe döngü üç öneriyi de aynı açılışla üretiyordu ("Yeni sezon
  // başlarken — …" üç kez), bu da "otomatik" hissi veriyordu.
  if (G.length > 0) {
    for (let i = 0; i < G.length * T.length; i++) {
      const giris = G[i % G.length]
      const teklif = T[(Math.floor(i / G.length) + i) % T.length]
      adaylar.push(`${giris} — ${teklif}`)
    }
  }
  for (const teklif of T) adaylar.push(bufHarf(teklif))

  const yasak = new Set(harici.map((h) => h.trim().toLocaleLowerCase('tr-TR')))
  const secilen: string[] = []
  for (const a of adaylar) {
    if (yasak.has(a.trim().toLocaleLowerCase('tr-TR'))) continue
    if (secilen.includes(a)) continue
    secilen.push(a)
    // adet=0 → SINIR YOK (Faz 25). "Başka öner" havuzun tamamını ister;
    // üçe kırpılmış liste her tıklamada aynı üçü verirdi.
    if (adet > 0 && secilen.length >= adet) break
  }
  // Hepsi yasaklıysa yine de bir şey öner — boş dönmek işe yaramaz.
  return secilen.length > 0 ? secilen : adaylar.slice(0, adet)
}

/** Kampanyanın kısa açıklaması (bant altı / panel listesi / mail girişi). */
export function kampanyaAciklamalari(
  b: MetinBaglami,
  secenek: { adet?: number; harici?: string[]; tohum?: string } = {}
): string[] {
  const temel = kampanyaMetinleri(b, { ...secenek, adet: 4 })
  const kapsam = kapsamIfadesi(b)
  const kuyruklar = [
    b.tip === 'kupon' ? 'Kodu ödeme adımında girin.' : 'Sepette otomatik uygulanır.',
    'Ayrıca bir işlem yapmanıza gerek yok.',
    ...(b.kapsamAdi ? [`Yalnız ${kapsam} geçerli.`] : []),
    'Tüm siparişlerde kargo ücretsiz.',
  ]
  const t = tohumla(`${secenek.tohum ?? ''}|aciklama`)
  return temel
    .slice(0, secenek.adet ?? 3)
    .map((m, i) => `${m}. ${dondur(kuyruklar, t)[i % kuyruklar.length]}`)
}
