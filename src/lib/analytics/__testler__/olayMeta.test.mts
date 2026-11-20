import { metaTemizle, sepetKaynagiMi, SEPET_KAYNAKLARI } from '../olayMeta.ts'

/**
 * Ölçüm `meta` kuralı testleri (20 Kas 2026).
 *
 * 14 Kas'ta page_view'un 'istemci' işaretini kayıttan atmak için eklenen kural
 * 'kaynak'ı HER olayda attı; sepete eklemenin nereden yapıldığı 6 gün boyunca
 * sessizce kayboldu. Bu testler iki anlamın birbirini ezmediğini sınar.
 */
let gecti = 0, kaldi = 0
const esit = (ad: string, bulunan: unknown, beklenen: unknown) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`${ok ? '  ✓' : '  ✗'} ${ad}${ok ? '' : ` → bulunan ${JSON.stringify(bulunan)}, beklenen ${JSON.stringify(beklenen)}`}`)
  if (ok) gecti++
  else kaldi++
}

// Sepete ekleme: kaynak kayda geçer (her bilinen değer)
for (const k of SEPET_KAYNAKLARI) {
  esit(`add_to_cart kaynak=${k} yazılır`, metaTemizle({ quantity: 1, kaynak: k }, 'add_to_cart'), { quantity: 1, kaynak: k })
}
// Bilinmeyen değer yazılmaz, adet kalır
esit('add_to_cart uydurma kaynak atılır', metaTemizle({ quantity: 2, kaynak: 'uydurma' }, 'add_to_cart'), { quantity: 2 })
esit('add_to_cart sayı kaynak atılır', metaTemizle({ quantity: 1, kaynak: 5 }, 'add_to_cart'), { quantity: 1 })
// Sayfa görüntüleme: 'istemci' işareti kayda yazılmaz, js ve utm kalır
esit('page_view istemci işareti atılır', metaTemizle({ kaynak: 'istemci', js: 1, utm_source: 'instagram' }, 'page_view'), { js: 1, utm_source: 'instagram' })
esit('page_view yalnız işaret → boş', metaTemizle({ kaynak: 'istemci' }, 'page_view'), null)
// Başka olayda kaynak anlamsız: yazılmaz
esit('favorite_add kaynak atılır', metaTemizle({ kaynak: 'kart' }, 'favorite_add'), null)
// Eski kurallar aynen: dizi/obje atılır, metin 120'de kesilir, en fazla 10 anahtar
esit('dizi ve obje değer atılır', metaTemizle({ a: [1], b: { c: 1 }, d: true }, 'search'), { d: true })
esit('metin 120 karakterde kesilir', (metaTemizle({ q: 'x'.repeat(200) }, 'search') as { q: string }).q.length, 120)
const onIki = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, i]))
esit('en fazla 10 anahtar', Object.keys(metaTemizle(onIki, 'search') ?? {}).length, 10)
esit('obje değilse boş', metaTemizle('metin', 'add_to_cart'), null)
esit('sepetKaynagiMi kart', sepetKaynagiMi('kart'), true)
esit('sepetKaynagiMi istemci', sepetKaynagiMi('istemci'), false)

console.log(`\n${gecti} geçti, ${kaldi} kaldı`)
if (kaldi) process.exit(1)
