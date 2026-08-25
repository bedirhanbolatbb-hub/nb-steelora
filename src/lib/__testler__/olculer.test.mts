import { strict as assert } from 'node:assert'
import { urunOlcusu } from '../catalog/olculer.ts'

const durumlar: [string, ReturnType<typeof urunOlcusu>][] = []
function kontrol(ad: string, girdi: Parameters<typeof urunOlcusu>[0], beklenen: string | null) {
  const c = urunOlcusu(girdi)
  assert.equal(c, beklenen, `${ad}: "${c}" ≠ "${beklenen}"`)
  durumlar.push([ad, c])
}

kontrol('başlıkta boşluklu', { trendyol_title: 'Erkek Çelik Kolye 60 cm' }, '60 cm')
kontrol('başlıkta bitişik', { trendyol_title: 'Çelik Arpa Kolye Gold 55cm' }, '55 cm')
kontrol('ondalık virgül', { variant_label: '6,5 cm' }, '6,5 cm')
kontrol('ondalık nokta virgüle döner', { trendyol_title: 'Bileklik 6.5 cm' }, '6,5 cm')
kontrol('mm birimi', { trendyol_title: 'Çelik Halka Küpe 12 mm' }, '12 mm')
kontrol('birimsiz beden ölçü değil', { variant_label: 'Standart', trendyol_title: 'Çelik Kolye' }, null)
kontrol('ayarlanabilir ölçü değil', { variant_label: 'Ayarlanabilir' }, null)
kontrol('birimsiz sayı ölçü değil', { trendyol_title: '316L Çelik Kolye 2026' }, null)
kontrol('makul olmayan değer elenir', { trendyol_title: 'Kolye 500 cm' }, null)
kontrol('HTML açıklamadan okur', { trendyol_description: '<p>Zincir <b>45 cm</b> uzunluğundadır.</p>' }, '45 cm')
kontrol('başlık açıklamayı yener', { trendyol_title: 'Kolye 60 cm', trendyol_description: 'Zincir 45 cm' }, '60 cm')
kontrol('hiç ölçü yoksa null', { trendyol_title: 'Çelik Yüzük', trendyol_description: 'Paslanmaz çelik.' }, null)
kontrol('cm ile başlayan kelime yanlış eşleşmez', { trendyol_title: 'Kolye 3 cmyx' }, null)
kontrol('boş ürün', {}, null)

console.log(`✓ ${durumlar.length}/${durumlar.length} ölçü testi geçti`)
for (const [ad, c] of durumlar) console.log(`   ${ad.padEnd(34)} → ${c ?? '(basılmaz)'}`)
