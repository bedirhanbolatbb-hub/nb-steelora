import { strict as assert } from 'node:assert'
import { markaKategorisi } from '../catalog/categories.ts'

const durumlar: [string, string][] = [
  ['Bijuteri Bileklik', 'Bileklik'],
  ['Çelik Bileklik', 'Bileklik'],
  ['Çelik Kolye', 'Kolye'],
  ['Bijuteri Kolye', 'Kolye'],
  ['Çelik Küpe', 'Küpe'],
  ['Bijuteri Küpe', 'Küpe'],
  ['Çelik Yüzük', 'Yüzük'],
  ['Piercing', 'Piercing'],
  ['Bijuteri Halhal', 'Halhal'],
  ['Bilezik', 'Bileklik'],
  ['', ''],
  ['Bilinmeyen Kategori', 'Bilinmeyen Kategori'],
]
for (const [girdi, beklenen] of durumlar) {
  const c = markaKategorisi(girdi)
  assert.equal(c, beklenen, `"${girdi}" → "${c}" (beklenen "${beklenen}")`)
  console.log(`   ${(girdi || '(boş)').padEnd(22)} → ${c || '(boş)'}`)
}
console.log(`✓ ${durumlar.length}/${durumlar.length} marka kategorisi testi geçti`)
