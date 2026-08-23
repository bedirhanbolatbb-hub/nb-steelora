/** Faz 25 · gölgeleme tespiti — yanlış alarm vermemesi esas. */
import { golgeDurumu, type GolgeKampanyasi } from '@/lib/campaigns/golge'

let gecti = 0
let kaldi = 0
const esit = (ad: string, bulunan: unknown, beklenen: unknown) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`  ${ok ? '✓' : '✗'} ${ad}${ok ? '' : ` → ${JSON.stringify(bulunan)}`}`)
  ok ? gecti++ : kaldi++
}

const K = (o: Partial<GolgeKampanyasi> & { id: string }): GolgeKampanyasi => ({
  ad: o.id,
  indirimTipi: 'percent',
  deger: 10,
  kapsam: 'cart',
  birlesebilir: false,
  koduVar: false,
  aktif: true,
  baslangic: null,
  bitis: null,
  minSepet: 0,
  ...o,
})

const nb30 = K({ id: 'nb30', ad: 'NB30', deger: 30 })
const hosgeldin = K({ id: 'hg', ad: 'Hoş Geldin', deger: 10, koduVar: true })

esit('gerçek durum: %10 kupon, %30 otomatik varken gölgeli', golgeDurumu(hosgeldin, [hosgeldin, nb30]).golgeliMi, true)
esit('  gölgeleyenin adı', golgeDurumu(hosgeldin, [hosgeldin, nb30]).golgeleyenAd, 'NB30')
esit('NB30 kendisi gölgeli değil', golgeDurumu(nb30, [hosgeldin, nb30]).golgeliMi, false)
esit('tek başına kampanya gölgeli değil', golgeDurumu(hosgeldin, [hosgeldin]).golgeliMi, false)

// Yanlış alarm vermemesi gereken durumlar
esit(
  'KAPSAMLI kampanya gölgeli SAYILMAZ (bazı sepetlerde kazanır)',
  golgeDurumu(K({ id: 'a', deger: 40, kapsam: 'product' }), [K({ id: 'a', deger: 40, kapsam: 'product' }), nb30]).golgeliMi,
  false
)
esit(
  'BİRLEŞEBİLİR kampanya gölgeli değil (ikisi birden uygulanır)',
  golgeDurumu(K({ id: 'b', deger: 10, birlesebilir: true }), [K({ id: 'b', birlesebilir: true }), nb30]).golgeliMi,
  false
)
esit(
  'gölgeleyen aday BİRLEŞEBİLİRSE gölgeleme yok',
  golgeDurumu(hosgeldin, [hosgeldin, K({ id: 'nb30', deger: 30, birlesebilir: true })]).golgeliMi,
  false
)
esit(
  'gölgeleyen adayın SEPET ALT SINIRI varsa gölgeleme yok',
  golgeDurumu(hosgeldin, [hosgeldin, K({ id: 'nb30', deger: 30, minSepet: 500 })]).golgeliMi,
  false
)
esit(
  'gölgeleyen aday KOD gerektiriyorsa gölgeleme yok',
  golgeDurumu(hosgeldin, [hosgeldin, K({ id: 'nb30', deger: 30, koduVar: true })]).golgeliMi,
  false
)
esit(
  'gölgeleyen aday PASİFSE gölgeleme yok',
  golgeDurumu(hosgeldin, [hosgeldin, K({ id: 'nb30', deger: 30, aktif: false })]).golgeliMi,
  false
)
esit(
  'daha DÜŞÜK yüzdeli kampanya gölgelemez',
  golgeDurumu(K({ id: 'c', deger: 30 }), [K({ id: 'c', deger: 30 }), K({ id: 'd', deger: 10 })]).golgeliMi,
  false
)
esit(
  'EŞİT yüzde gölgeler (çakışmada biri kaybeder)',
  golgeDurumu(K({ id: 'e', deger: 30, koduVar: true }), [K({ id: 'e', deger: 30, koduVar: true }), nb30]).golgeliMi,
  true
)
esit(
  'SABİT TUTAR kampanya karşılaştırılmaz',
  golgeDurumu(K({ id: 'f', indirimTipi: 'fixed', deger: 50 }), [K({ id: 'f', indirimTipi: 'fixed' }), nb30]).golgeliMi,
  false
)

// Tarih aralıkları
const eskiNb = K({ id: 'nb30', ad: 'NB30', deger: 30, baslangic: '2026-08-01', bitis: '2026-08-31' })
esit(
  'tarihler KESİŞMİYORSA gölgeleme yok',
  golgeDurumu(K({ id: 'g', koduVar: true, baslangic: '2026-09-01', bitis: null }), [
    K({ id: 'g', koduVar: true, baslangic: '2026-09-01' }),
    eskiNb,
  ]).golgeliMi,
  false
)
esit(
  'tarihler KESİŞİYORSA gölgeleme var',
  golgeDurumu(K({ id: 'h', koduVar: true, baslangic: '2026-08-15', bitis: null }), [
    K({ id: 'h', koduVar: true, baslangic: '2026-08-15' }),
    eskiNb,
  ]).golgeliMi,
  true
)
esit('PASİF kampanya için uyarı basılmaz', golgeDurumu(K({ id: 'i', aktif: false }), [K({ id: 'i', aktif: false }), nb30]).golgeliMi, false)

// Faz 25'in gerçek kurulumu: HOSGELDIN10 tam NB30'un bittiği anda başlıyor.
esit(
  'BİTİŞİK tarihler çakışma sayılmaz (gölgeleme yok)',
  golgeDurumu(
    K({ id: 'hg2', koduVar: true, deger: 10, baslangic: '2026-08-31T20:59:00Z', bitis: '2027-04-17' }),
    [
      K({ id: 'hg2', koduVar: true, deger: 10, baslangic: '2026-08-31T20:59:00Z', bitis: '2027-04-17' }),
      K({ id: 'nb', ad: 'NB30', deger: 30, baslangic: '2026-08-21', bitis: '2026-08-31T20:59:00Z' }),
    ]
  ).golgeliMi,
  false
)

console.log(`\n  ${gecti} geçti, ${kaldi} kaldı`)
process.exit(kaldi ? 1 : 0)
