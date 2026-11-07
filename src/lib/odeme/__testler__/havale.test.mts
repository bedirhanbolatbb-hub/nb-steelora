/** Havale/EFT · IBAN denetimi ve ek indirim hesabı (7 Kas 2026). */
import {
  havaleAyariDogrula,
  havaleHazirMi,
  havaleIndirimiAktifMi,
  havaleIndirimiHesapla,
  ibanBicimle,
  ibanGecerliMi,
  type HavaleAyari,
} from '@/lib/odeme/havale'

let gecti = 0
let kaldi = 0
const esit = (ad: string, bulunan: unknown, beklenen: unknown) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`  ${ok ? '✓' : '✗'} ${ad}${ok ? '' : ` → ${JSON.stringify(bulunan)} (beklenen ${JSON.stringify(beklenen)})`}`)
  ok ? gecti++ : kaldi++
}

const GECERLI = 'TR860004600000000000123456'

console.log('IBAN')
esit('geçerli IBAN', ibanGecerliMi(GECERLI), true)
esit('boşluklu ve küçük harfli yazım', ibanGecerliMi('tr86 0004 6000 0000 0000 1234 56'), true)
esit('tek hane hatalı → geçersiz', ibanGecerliMi('TR860004600000000000123457'), false)
esit('eksik hane → geçersiz', ibanGecerliMi('TR86000460000000000012345'), false)
esit('yabancı IBAN → geçersiz', ibanGecerliMi('DE89370400440532013000'), false)
esit('biçimleme', ibanBicimle(GECERLI), 'TR86 0004 6000 0000 0000 1234 56')

const ayar: HavaleAyari = {
  banka: 'Akbank',
  alici: 'İsa Bolat',
  iban: GECERLI,
  indirimOrani: 10,
  indirimBaslangic: '2026-11-10T21:00:00.000Z', // 11 Kasım 00.00 İstanbul
  indirimBitis: '2026-11-30T20:59:00.000Z', // 30 Kasım 23.59 İstanbul
}

console.log('hazır mı')
esit('dolu ayar hazır', havaleHazirMi(ayar), true)
esit('IBAN boş → hazır değil', havaleHazirMi({ ...ayar, iban: '' }), false)
esit('alıcı boş → hazır değil', havaleHazirMi({ ...ayar, alici: ' ' }), false)
esit('ayar yok → hazır değil', havaleHazirMi(null), false)

console.log('dönem')
esit('10 Kasım 23.59 → kapalı (on gün kuralı)', havaleIndirimiAktifMi(ayar, new Date('2026-11-10T20:59:00Z')), false)
esit('11 Kasım 00.00 → açık', havaleIndirimiAktifMi(ayar, new Date('2026-11-10T21:00:00Z')), true)
esit('30 Kasım 23.59 → açık', havaleIndirimiAktifMi(ayar, new Date('2026-11-30T20:59:00Z')), true)
esit('1 Aralık → kapalı', havaleIndirimiAktifMi(ayar, new Date('2026-11-30T21:00:00Z')), false)
esit('oran 0 → kapalı', havaleIndirimiAktifMi({ ...ayar, indirimOrani: 0 }, new Date('2026-11-15T10:00:00Z')), false)

console.log('hesap')
const kasimOrtasi = new Date('2026-11-15T10:00:00Z')
// 499,90 ürün, %25 kampanya (124,98) → 374,92 üzerinden %10 = 37,49 → toplam %32,5
esit(
  '%25 üstüne %10',
  havaleIndirimiHesapla({ araToplam: 499.9, kampanyaIndirimi: 124.98, ayar, simdi: kasimOrtasi }),
  { oran: 10, tutar: 37.49 }
)
esit(
  'kampanyasız sepet',
  havaleIndirimiHesapla({ araToplam: 400, kampanyaIndirimi: 0, ayar, simdi: kasimOrtasi }),
  { oran: 10, tutar: 40 }
)
// %30 kampanya + %10 → %37 olurdu; tavan %35 → 1000'de en fazla 50 TL ek
esit(
  'tavan %35 aşılmaz',
  havaleIndirimiHesapla({ araToplam: 1000, kampanyaIndirimi: 300, ayar, simdi: kasimOrtasi }),
  { oran: 10, tutar: 50 }
)
esit(
  'tavan zaten doluysa ek indirim yok',
  havaleIndirimiHesapla({ araToplam: 1000, kampanyaIndirimi: 350, ayar, simdi: kasimOrtasi }),
  { oran: 0, tutar: 0 }
)
esit(
  'dönem dışında 0',
  havaleIndirimiHesapla({ araToplam: 400, kampanyaIndirimi: 0, ayar, simdi: new Date('2026-11-09T10:00:00Z') }),
  { oran: 0, tutar: 0 }
)
esit(
  'IBAN yoksa 0',
  havaleIndirimiHesapla({ araToplam: 400, kampanyaIndirimi: 0, ayar: { ...ayar, iban: '' }, simdi: kasimOrtasi }),
  { oran: 0, tutar: 0 }
)

console.log('panel doğrulaması')
const d1 = havaleAyariDogrula({ banka: 'Akbank', alici: 'İsa Bolat', iban: 'tr86 0004 6000 0000 0000 1234 56', indirimOrani: 0 })
esit('indirimsiz kayıt geçer, IBAN temizlenir', 'ayar' in d1 ? d1.ayar.iban : d1.hata, GECERLI)
const d2 = havaleAyariDogrula({ banka: 'Akbank', alici: 'İsa Bolat', iban: GECERLI, indirimOrani: 10 })
esit('indirim var tarih yok → hata', 'hata' in d2, true)
const d3 = havaleAyariDogrula({ banka: 'Akbank', alici: 'İsa Bolat', iban: GECERLI, indirimOrani: 25, indirimBaslangic: ayar.indirimBaslangic, indirimBitis: ayar.indirimBitis })
esit('%25 → üst sınır hatası', 'hata' in d3, true)
const d4 = havaleAyariDogrula({ banka: 'Akbank', alici: 'İsa Bolat', iban: 'TR000', indirimOrani: 0 })
esit('bozuk IBAN → hata', 'hata' in d4, true)

console.log(`\n${gecti} geçti, ${kaldi} kaldı`)
if (kaldi > 0) process.exit(1)
