/** Kasım 2026 · indirimden önceki fiyat "on gün" kuralı. */
import {
  enErkenTemizBaslangic,
  herkeseIndirimMi,
  indirimDuyurusuSerbestMi,
  onGunCakismasi,
  type IndirimSatiri,
} from '@/lib/campaigns/onGunKurali'

let gecti = 0
let kaldi = 0
const esit = (ad: string, bulunan: unknown, beklenen: unknown) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`  ${ok ? '✓' : '✗'} ${ad}${ok ? '' : ` → ${JSON.stringify(bulunan)} (beklenen ${JSON.stringify(beklenen)})`}`)
  ok ? gecti++ : kaldi++
}

// Canlıdaki gerçek kayıtlar (panelden okundu, 7 Kasım 2026)
const nb25: IndirimSatiri = {
  id: 'nb25', name: 'NB25', type: 'cart_discount', code: 'NB25', requires_code: false,
  discount_value: 25, min_cart_amount: 0, scope: 'cart', is_active: true,
  starts_at: '2026-10-15T14:30:00Z', ends_at: '2026-10-31T20:59:00Z', // 15 Eki 17.30 – 31 Eki 23.59 TR
}
const hosgeldin: IndirimSatiri = {
  id: 'hg', name: 'Hoş Geldin İndirimi', type: 'discount_code', code: 'HOSGELDIN10', requires_code: true,
  discount_value: 10, first_order_only: true, is_active: true,
  starts_at: '2026-09-30T21:00:00Z', ends_at: '2027-04-17T20:59:00Z',
}
const kasim: IndirimSatiri = {
  id: 'kasim', name: 'Kasım İndirimi', type: 'cart_discount', requires_code: false,
  discount_value: 25, min_cart_amount: 0, scope: 'cart', is_active: true,
  starts_at: '2026-11-10T21:00:00Z', ends_at: '2026-11-30T20:59:00Z',
}
const kosullu: IndirimSatiri = { ...nb25, id: 'k', name: '500 üzeri', min_cart_amount: 500 }

console.log('herkeseIndirimMi')
esit('NB25 herkese açık', herkeseIndirimMi(nb25), true)
esit('kodlu ilk sipariş indirimi değil', herkeseIndirimMi(hosgeldin), false)
esit('sepet koşullu değil', herkeseIndirimMi(kosullu), false)
esit('kategori kapsamlı değil', herkeseIndirimMi({ ...nb25, scope: 'category' }), false)

console.log('enErkenTemizBaslangic')
esit('NB25 bitişi → 11 Kasım 00.00 TR', enErkenTemizBaslangic(nb25.ends_at!).toISOString(), '2026-11-10T21:00:00.000Z')
esit('tam gece yarısı bitiş → bir gün daha temkinli', enErkenTemizBaslangic('2026-10-31T21:00:00Z').toISOString(), '2026-11-11T21:00:00.000Z')

console.log('onGunCakismasi')
esit('7 Kasım başlangıç NB25 ile çakışır', onGunCakismasi('2026-11-07T06:00:00Z', [nb25, hosgeldin])?.ad, 'NB25')
esit('  en erken temiz başlangıç 11 Kasım', onGunCakismasi('2026-11-07T06:00:00Z', [nb25])?.enErken?.toISOString(), '2026-11-10T21:00:00.000Z')
esit('10 Kasım 23.59 hâlâ çakışır', onGunCakismasi('2026-11-10T20:59:00Z', [nb25]) !== null, true)
esit('11 Kasım 00.00 temiz', onGunCakismasi(kasim.starts_at!, [nb25, hosgeldin]), null)
esit('düzenlenen kampanya kendisiyle çakışmaz', onGunCakismasi(kasim.starts_at!, [kasim, nb25], 'kasim'), null)
esit('pasif kampanya sayılmaz', onGunCakismasi('2026-11-07T06:00:00Z', [{ ...nb25, is_active: false }]), null)
esit('kodlu kupon pencereyi kirletmez', onGunCakismasi('2026-11-07T06:00:00Z', [hosgeldin]), null)

console.log('indirimDuyurusuSerbestMi')
esit('7 Kasım: ilk sipariş kodu duyurulamaz', indirimDuyurusuSerbestMi([nb25, hosgeldin], new Date('2026-11-07T09:00:00Z')), false)
esit('15 Kasım: Kasım indirimi sürüyor, duyurulamaz', indirimDuyurusuSerbestMi([nb25, kasim], new Date('2026-11-15T09:00:00Z')), false)
esit('5 Aralık: Kasım bitişinden 5 gün sonra, duyurulamaz', indirimDuyurusuSerbestMi([kasim], new Date('2026-12-05T09:00:00Z')), false)
esit('11 Aralık: serbest', indirimDuyurusuSerbestMi([kasim], new Date('2026-12-10T21:00:00Z')), true)

console.log(`\n${gecti} geçti, ${kaldi} kaldı`)
if (kaldi) process.exit(1)
