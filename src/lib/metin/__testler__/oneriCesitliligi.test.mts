/**
 * Faz 25 · "Başka öner" beş tıklamada beş farklı üçlü veriyor mu?
 *
 * MetinOner'in pencere mantığının BİREBİR aynısı burada tekrarlanır; amaç
 * bileşeni değil, üreteç havuzlarının pencereyi besleyecek kadar büyük ve
 * çeşitli olduğunu kanıtlamaktır.
 */
import { kategoriTanitimi, koleksiyonTanitimi } from '@/lib/metin/kategoriMetni'
import { kampanyaMetinleri } from '@/lib/metin/kampanyaMetni'
import { urunAciklamasiVaryantlari } from '@/lib/metin/urunAciklamasi'

const PENCERE = 3

const obeb = (a: number, b: number): number => (b === 0 ? a : obeb(b, a % b))
const adimSec = (n: number): number => {
  for (let adim = PENCERE; adim < n + PENCERE; adim++) {
    if (obeb(adim % n || n, n) === 1) return adim
  }
  return 1
}

/** MetinOner.yenile() ile aynı algoritma. */
function tiklamalar(uret: () => string[], kere = 5): string[][] {
  let imlec = 0
  let onceki: string[] = []
  const cikti: string[][] = []
  for (let t = 0; t < kere; t++) {
    const havuz = uret()
    if (havuz.length <= PENCERE) {
      onceki = havuz
      cikti.push(havuz)
      continue
    }
    const oncekiImza = onceki.join(' ')
    const adim = adimSec(havuz.length)
    for (let deneme = 0; deneme < havuz.length; deneme++) {
      imlec = (imlec + adim) % havuz.length
      const pencere = Array.from({ length: PENCERE }, (_, i) => havuz[(imlec + i) % havuz.length])
      if (pencere.join(' ') !== oncekiImza) {
        onceki = pencere
        cikti.push(pencere)
        break
      }
    }
  }
  return cikti
}

let kaldi = 0
const dene = (ad: string, uret: () => string[]) => {
  const havuz = uret()
  const turlar = tiklamalar(uret)
  const imzalar = turlar.map((t) => t.join('|'))
  const farkli = new Set(imzalar).size
  // Ardışık tekrar var mı?
  let ardisik = false
  for (let i = 1; i < imzalar.length; i++) if (imzalar[i] === imzalar[i - 1]) ardisik = true
  const ok = farkli === 5 && !ardisik
  if (!ok) kaldi++
  console.log(`\n${ok ? '✓' : '✗'} ${ad}`)
  console.log(`   havuz ${havuz.length} aday · 5 tıklamada ${farkli} farklı üçlü · ardışık tekrar: ${ardisik ? 'VAR' : 'yok'}`)
  turlar.forEach((t, i) => console.log(`   ${i + 1}. ${t.map((s) => s.slice(0, 30)).join(' / ')}`))
}

dene('Kategori tanıtımı — kolye', () => kategoriTanitimi('kolye', 'Kolye'))
dene('Kategori tanıtımı — küpe', () => kategoriTanitimi('kupe', 'Küpe'))
dene('Kategori tanıtımı — bilinmeyen slug', () => kategoriTanitimi('takim', 'Takım'))
dene('Koleksiyon tanıtımı — adet bilinen', () => koleksiyonTanitimi('Günlük Zarafet', 12))
dene('Koleksiyon tanıtımı — adet bilinmeyen', () => koleksiyonTanitimi('Yaz Seçkisi'))
dene('Kampanya vitrin metni — %30 sepet', () =>
  kampanyaMetinleri({ tip: 'sepet_yuzde', deger: 30, kapsamAdi: null, vesile: 'yok' } as any, {
    adet: 0,
    tohum: 'NB30',
  })
)
dene('Kampanya vitrin metni — kupon, kategori kapsamı', () =>
  kampanyaMetinleri(
    { tip: 'kapsam_yuzde', deger: 10, kapsamAdi: 'Kolye', vesile: 'yaz', kod: 'HOSGELDIN10' } as any,
    { adet: 0, tohum: 'HOSGELDIN10' }
  )
)
dene('Ürün açıklaması — zengin veri', () =>
  urunAciklamasiVaryantlari({
    baslik: 'Zirkon Taşlı Dört Yaprak Kolye Silver',
    kategori: 'Çelik Kolye',
    malzeme: '316L Paslanmaz Çelik',
    bakim: 'Suyla ve parfümle temas ettirmeyin.',
    olcu: '45 cm',
  })
)

console.log(`\n${kaldi === 0 ? 'HEPSİ GEÇTİ' : `${kaldi} BAŞARISIZ`}`)
process.exit(kaldi ? 1 : 0)
