/** 21 Kas 2026 · sepet eşitlemesi — "ödeme yapamıyorum" kök nedeninin testi. */
import { sepetiEsitle, esitlemeNotu } from '../sepetEsitleme.ts'

let gecti = 0
let kaldi = 0
const esit = (ad: string, bulunan: unknown, beklenen: unknown) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`  ${ok ? '✓' : '✗'} ${ad}${ok ? '' : ` → ${JSON.stringify(bulunan)}`}`)
  ok ? gecti++ : kaldi++
}

const k = (id: string, fiyat: number, adet = 1) => ({ product: { id, display_price: fiyat, ad: id }, quantity: adet })

// 1) Fiyatı değişen kalem sunucu fiyatına çekilir, diğer alanlar korunur.
let s = sepetiEsitle([k('a', 449.9, 2), k('b', 399.9)], [{ productId: 'a', fiyat: 499.9 }, { productId: 'b', fiyat: 399.9 }], [])
esit('eski fiyat güncellenir', s.items.map((i) => i.product.display_price), [499.9, 399.9])
esit('adet korunur', s.items.map((i) => i.quantity), [2, 1])
esit('diğer alanlar korunur', (s.items[0].product as any).ad, 'a')
esit('sayaç', [s.fiyatiDegisen, s.cikarilan, s.degisti], [1, 0, true])

// 2) Satışta olmayan kalem çıkar.
s = sepetiEsitle([k('a', 449.9), k('x', 100)], [{ productId: 'a', fiyat: 449.9 }], ['x'])
esit('geçersiz çıkar', s.items.map((i) => i.product.id), ['a'])
esit('çıkarılan sayısı', [s.fiyatiDegisen, s.cikarilan, s.degisti], [0, 1, true])

// 3) Aynı fiyatta (eşik içinde) dokunulmaz — gereksiz yazım yok.
const once = [k('a', 374.92)]
s = sepetiEsitle(once, [{ productId: 'a', fiyat: 374.925 }], [])
esit('eşik içinde değişmez', s.degisti, false)
esit('aynı nesne döner', s.items[0] === once[0], true)

// 4) Bozuk sunucu cevabı sepeti BOZMAZ: fiyat yoksa ya da geçersizse kalem kalır.
s = sepetiEsitle([k('a', 449.9)], [{ productId: 'a', fiyat: NaN } as any, { productId: '', fiyat: 10 }], null)
esit('bozuk fiyat yok sayılır', [s.items.length, s.items[0].product.display_price, s.degisti], [1, 449.9, false])
s = sepetiEsitle([k('a', 449.9)], null, undefined)
esit('cevap yoksa dokunulmaz', [s.items.length, s.degisti], [1, false])
s = sepetiEsitle([k('a', 449.9)], [{ productId: 'a', fiyat: 0 }], [])
esit('sıfır fiyat kabul edilmez', s.items[0].product.display_price, 449.9)

// 5) Müşteri notu.
esit('not: fiyat', esitlemeNotu({ fiyatiDegisen: 1, cikarilan: 0 }), 'Sepetinizdeki bir ürünün fiyatı güncellendi; tutar güncel fiyatla gösteriliyor.')
esit('not: ikisi', esitlemeNotu({ fiyatiDegisen: 2, cikarilan: 1 }), 'Sepetinizdeki bir ürün artık satışta olmadığı için sepetten çıkarıldı. Sepetinizdeki 2 ürünün fiyatı güncellendi; tutar güncel fiyatla gösteriliyor.')
esit('not: yok', esitlemeNotu({ fiyatiDegisen: 0, cikarilan: 0 }), null)

console.log(`\n${gecti} geçti, ${kaldi} kaldı`)
if (kaldi > 0) process.exit(1)
