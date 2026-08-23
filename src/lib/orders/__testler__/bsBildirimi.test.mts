/** Faz 28 · Bs bildirimi eşiği — KDV matrahı hesabı. */
import { kdvHaric, BS_ESIGI_TL, KDV_ORANI } from '@/lib/orders/bsBildirimi'

let gecti = 0
let kaldi = 0
const esit = (ad: string, bulunan: unknown, beklenen: unknown) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`  ${ok ? '✓' : '✗'} ${ad}${ok ? '' : ` → ${JSON.stringify(bulunan)} ≠ ${JSON.stringify(beklenen)}`}`)
  ok ? gecti++ : kaldi++
}

esit('KDV oranı %20', KDV_ORANI, 0.2)
esit('eşik 5000 TL', BS_ESIGI_TL, 5000)

// KDV dahil → matrah
esit('1200 TL (KDV dahil) → 1000 matrah', kdvHaric(1200), 1000)
esit('6000 TL → 5000 matrah (tam eşikte)', kdvHaric(6000), 5000)
esit('449,90 TL → 374,92', kdvHaric(449.9), 374.92)

// Eşik kararı: matrah eşiği AŞMALI, eşitlik yetmez
const asti = (kdvDahil: number) => kdvHaric(kdvDahil) > BS_ESIGI_TL
esit('6000 TL tam eşik → AŞMADI', asti(6000), false)
esit('6001 TL → aştı', asti(6001), true)
esit('5999 TL → aşmadı', asti(5999), false)

// Gerçek katalog: 649 TL en pahalı ürün — kaç adet gerekir?
let adet = 0
let toplam = 0
while (kdvHaric(toplam) <= BS_ESIGI_TL) {
  toplam += 649
  adet++
}
console.log(`\n  649 TL'lik üründen eşiği aşmak için: ${adet} adet (${toplam} TL, matrah ${kdvHaric(toplam)})`)
esit('eşik tek siparişte kolay aşılmıyor', adet >= 9, true)

console.log(`\n  ${gecti} geçti, ${kaldi} kaldı`)
process.exit(kaldi ? 1 : 0)
