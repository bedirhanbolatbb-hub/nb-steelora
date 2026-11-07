/** Kasım 2026 · ilk ekran ve şerit kampanya metni. */
import { ilkEkranKampanyasi, kampanyaAyi, seritKampanyaMesaji, tarihAraligi } from '@/lib/campaigns/kampanyaVitrini'

let gecti = 0
let kaldi = 0
const esit = (ad: string, bulunan: unknown, beklenen: unknown) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`  ${ok ? '✓' : '✗'} ${ad}${ok ? '' : ` → ${JSON.stringify(bulunan)} (beklenen ${JSON.stringify(beklenen)})`}`)
  ok ? gecti++ : kaldi++
}

const kasim = {
  oran: 25,
  fiyatGoster: true,
  baslangic: '2026-11-10T21:00:00+00:00',
  bitis: '2026-11-30T20:59:00+00:00',
  hedef: '/urunler',
}

console.log('tarihAraligi')
esit('aynı ay', tarihAraligi(kasim.baslangic, kasim.bitis), '11–30 Kasım')
esit('ay geçişi', tarihAraligi('2026-10-27T21:00:00Z', '2026-11-03T20:59:00Z'), '28 Ekim – 3 Kasım')
esit('gece yarısı bitiş önceki güne sayılır', tarihAraligi('2026-11-10T21:00:00Z', '2026-11-30T21:00:00Z'), '11–30 Kasım')
esit('yıl geçişi', tarihAraligi('2026-12-25T21:00:00Z', '2027-01-05T20:59:00Z'), '26 Aralık 2026 – 5 Ocak 2027')
esit('tarih yoksa null', tarihAraligi(null, kasim.bitis), null)

console.log('kampanyaAyi')
esit('Kasım', kampanyaAyi(kasim.baslangic, kasim.bitis), 'Kasım')
esit('iki aya yayılan → null', kampanyaAyi('2026-10-27T21:00:00Z', '2026-11-03T20:59:00Z'), null)

console.log('ilkEkranKampanyasi')
const m = ilkEkranKampanyasi(kasim)
esit('üst başlık', m?.ustBaslik, 'Kasım indirimi')
esit('başlık', m?.baslik, 'Tüm ürünlerde %25 indirim')
esit('vurgu', m?.vurgu, '%25')
esit('tarih', m?.tarih, '11–30 Kasım')
esit('hedef', m?.hedef, '/urunler')
esit('koşullu kampanyada basılmaz', ilkEkranKampanyasi({ ...kasim, fiyatGoster: false }), null)
esit('tarihsiz kampanyada basılmaz (tarih zorunlu)', ilkEkranKampanyasi({ ...kasim, bitis: null }), null)
esit('ünlem yok', /!/.test(JSON.stringify(m)), false)

console.log('seritKampanyaMesaji')
esit('şerit', seritKampanyaMesaji(kasim), 'Tüm ürünlerde %25 indirim, 11–30 Kasım')
esit('şerit ayırıcı içermez (• · |)', /\s[•·|]\s/.test(seritKampanyaMesaji(kasim) ?? ''), false)

console.log(`\n${gecti} geçti, ${kaldi} kaldı`)
if (kaldi) process.exit(1)
