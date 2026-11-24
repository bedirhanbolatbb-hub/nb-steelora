import { RENK_SUZGECI, renkGrubu, renkSecenekleri, renkTemizle, renkeGoreSuz, type RenkGrubu } from '@/lib/catalog/renk'

/**
 * Renk süzgeci testleri (24 Kas 2026). Örnek değerler ve adlar KarPanel'deki
 * gerçek Trendyol verisinden alındı.
 */
let g = 0
let k = 0
const e = (ad: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b)
  if (ok) g++
  else {
    k++
    console.error(`  ✗ ${ad} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`)
  }
}

// ── Gruplama
e('Altın → altın rengi', renkGrubu('Altın', 'Kalp Kolye'), 'altin')
e('Gümüş → gümüş rengi', renkGrubu('Gümüş', 'Kalp Kolye'), 'gumus')
e('boşluk ve büyük harf: " ALTIN "', renkGrubu(' ALTIN ', null), 'altin')
e('Türkçe büyük harf: GÜMÜŞ', renkGrubu('GÜMÜŞ', null), 'gumus')
e('Gold ve Silver de tanınır', [renkGrubu('Gold'), renkGrubu('Silver')], ['altin', 'gumus'])
e('harf + adda "Gold Renk" → altın rengi', renkGrubu('M', '316L Çelik Balon Gold Renk Harf Kolye'), 'altin')
e('harf + adda "Gümüş Renk" → gümüş rengi', renkGrubu('C', 'Kalp Detaylı Gümüş Renk Çelik Harf Kolye'), 'gumus')
e('harf küpe: "Gold Renk Harf Model Küpe"', renkGrubu('Z', '316L Çelik Gold Renk Harf Model Küpe'), 'altin')
e('Türkçe harf (Ş) de harf sayılır', renkGrubu('Ş', 'Balon Gümüş Renk Çelik Harf Kolye'), 'gumus')
e('harf ama adda renk yok → bilinmiyor', renkGrubu('A', 'Harf Kolye'), null)
e('harf ve ad yok → bilinmiyor', renkGrubu('A'), null)
e('adda yalnız "Gümüş" (renk beyanı değil) harfte yetmez', renkGrubu('A', 'Gümüş Zincir Harf Kolye'), null)
e('Beyaz → diğer renkler', renkGrubu('Beyaz', 'İnci Görünümlü Halhal'), 'diger')
e('Çok Renkli → diğer renkler', renkGrubu('Çok Renkli'), 'diger')
e('Siyah → diğer renkler', renkGrubu('Siyah', 'Çelik Siyah Renk Erkek Küpe'), 'diger')
e('renk boş → bilinmiyor (addan TAHMİN edilmez)', renkGrubu('', '316L Çelik Gold Renk Kolye'), null)
e('renk null → bilinmiyor', renkGrubu(null, 'Gümüş Renk Kolye'), null)
e('etiketler renk der, maden demez', RENK_SUZGECI.map((r) => r.label), ['Altın rengi', 'Gümüş rengi', 'Diğer renkler'])

// ── Yazılacak değer
e('temizle: boşluk kırpılır', renkTemizle('  Altın '), 'Altın')
e('temizle: boş → null', [renkTemizle(''), renkTemizle('   '), renkTemizle(null), renkTemizle(undefined)], [null, null, null, null])
e('temizle: uzun değer 40 karakterde kesilir', renkTemizle('x'.repeat(90))?.length, 40)

// ── Seçenekler ve süzme
const urunler = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }]
const harita = new Map<string, RenkGrubu>([
  ['a', 'altin'],
  ['b', 'gumus'],
  ['c', 'altin'],
  ['d', 'diger'],
  // 'e' bilinmiyor
])
e('seçenekler: listede bulunan gruplar, sabit sırayla', renkSecenekleri(urunler, harita).map((s) => s.value), ['altin', 'gumus', 'diger'])
e('seçenekler: yalnız listedeki ürünlere bakar', renkSecenekleri([{ id: 'a' }, { id: 'b' }], harita).map((s) => s.value), ['altin', 'gumus'])
e('seçenekler: tek grup varsa süzgeç basılmaz', renkSecenekleri([{ id: 'a' }, { id: 'c' }], harita), [])
e('seçenekler: renk verisi yokken boş', renkSecenekleri(urunler, new Map()), [])
e('süz: altın rengi', renkeGoreSuz(urunler, harita, 'altin').map((u) => u.id), ['a', 'c'])
e('süz: diğer renkler', renkeGoreSuz(urunler, harita, 'diger').map((u) => u.id), ['d'])
e('süz: rengi bilinmeyen ürün hiçbir seçenekte çıkmaz', renkeGoreSuz(urunler, harita, 'gumus').map((u) => u.id), ['b'])
e('süz: parametre yok → liste aynı', renkeGoreSuz(urunler, harita, undefined).length, 5)
e('süz: bilinmeyen değer → liste aynı', renkeGoreSuz(urunler, harita, 'mor').length, 5)
e('süz: renk verisi yokken liste aynı (eski bağlantı boş sayfa açmaz)', renkeGoreSuz(urunler, new Map(), 'altin').length, 5)
e('süz: sıra korunur', renkeGoreSuz([{ id: 'c' }, { id: 'a' }], harita, 'altin').map((u) => u.id), ['c', 'a'])

console.log(`\n  ${g} geçti, ${k} kaldı`)
process.exit(k ? 1 : 0)
