import { sepetHesabi, kampanyaIndirimi, kartFiyatiGosterilsinMi, kosulRozeti, INDIRIM_TAVANI_ORANI } from '/Users/bedir/Projects/nb-steelora/src/lib/campaigns/hesap.ts'

let gecti = 0, kaldi = 0
const esit = (ad: string, bulunan: any, beklenen: any) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`${ok ? '  ✓' : '  ✗'} ${ad}${ok ? '' : ` → bulunan ${JSON.stringify(bulunan)}, beklenen ${JSON.stringify(beklenen)}`}`)
  ok ? gecti++ : kaldi++
}
const K = (o: any) => ({ id: o.id ?? 'k1', ad: o.ad ?? 'Kampanya', tip: o.tip, kapsam: o.kapsam ?? 'sepet',
  hedefler: o.hedefler ?? [], deger: o.deger ?? null, minSepet: o.minSepet ?? 0, minAdet: o.minAdet ?? 0,
  alAdet: o.alAdet ?? null, odeAdet: o.odeAdet ?? null, kademeler: o.kademeler ?? null,
  birlesebilir: o.birlesebilir ?? false, oncelik: o.oncelik ?? 100, ilkAlisverisMi: o.ilkAlisverisMi ?? false,
  sadeceUyelere: o.sadeceUyelere ?? false, koduVar: o.koduVar ?? false })
const kolye = { productId: 'p1', fiyat: 449.90, adet: 1, kategori: 'Çelik Kolye', koleksiyonlar: ['gunluk-zarafet'], barkod: 'NBK199' }
const kupe  = { productId: 'p2', fiyat: 299.90, adet: 2, kategori: 'Bijuteri Küpe', koleksiyonlar: [], barkod: 'BKP090' }
const bileklik = { productId: 'p3', fiyat: 499.90, adet: 1, kategori: 'Çelik Bileklik', koleksiyonlar: [], barkod: 'NBB133' }

// 1) Sepet yüzde
esit('sepet %30 (449,90)', kampanyaIndirimi([kolye], K({tip:'sepet_yuzde', deger:30})), 134.97)
// 2) Sepet sabit
esit('sepet 50₺ sabit', kampanyaIndirimi([kolye], K({tip:'sepet_sabit', deger:50})), 50)
// 3) Sabit indirim sepeti aşamaz
esit('sabit 999₺ ama sepet 449,90', kampanyaIndirimi([kolye], K({tip:'sepet_sabit', deger:999})), 449.90)
// 4) Kategori kapsamı: yalnız kendi kalemine
esit('kolyelerde %20 (küpe hariç)', kampanyaIndirimi([kolye, kupe], K({tip:'kapsam_yuzde', kapsam:'kategori', hedefler:['kolye'], deger:20})), 89.98)
// 5) Koleksiyon kapsamı
esit('koleksiyonda %10', kampanyaIndirimi([kolye, kupe], K({tip:'kapsam_yuzde', kapsam:'koleksiyon', hedefler:['gunluk-zarafet'], deger:10})), 44.99)
// 6) Ürün kapsamı (barkodla)
esit('barkod hedefli %50', kampanyaIndirimi([kolye, kupe], K({tip:'kapsam_yuzde', kapsam:'urun', hedefler:['BKP090'], deger:50})), 299.90)
// 7) X al Y öde: 3 al 2 öde, 3 adet küpe+kolye
esit('3 al 2 öde (en ucuz bedava)', kampanyaIndirimi([kolye, kupe], K({tip:'x_al_y_ode', alAdet:3, odeAdet:2})), 299.90)
// 8) X al Y öde: yeterli adet yok
esit('4 al 3 öde ama 3 adet var', kampanyaIndirimi([kolye, kupe], K({tip:'x_al_y_ode', alAdet:4, odeAdet:3})), 0)
// 9) Kademeli: 1049,70₺ sepet → 1000 eşiği
esit('kademeli 500→%10, 1000→%20', kampanyaIndirimi([kolye, kupe], K({tip:'kademeli', kademeler:[{minTutar:500,oran:10},{minTutar:1000,oran:20}]})), 209.94)
// 10) Kademeli: eşik altı
esit('kademeli eşik altı', kampanyaIndirimi([kolye], K({tip:'kademeli', kademeler:[{minTutar:500,oran:10}]})), 0)

// 11) Çakışma: iki kapalı kampanya → en yüksek tek
{
  const s = sepetHesabi({ kalemler:[kolye,kupe], kampanyalar:[
    K({id:'a', ad:'%30', tip:'sepet_yuzde', deger:30}),
    K({id:'b', ad:'%10 kupon', tip:'sepet_yuzde', deger:10, koduVar:true}),
  ]})
  esit('kapalı+kapalı → tek (yüksek)', [s.uygulananlar.length, s.indirimToplami], [1, 314.91])
}
// 12) Birleşebilir ikisi → toplanır
{
  const s = sepetHesabi({ kalemler:[kolye,kupe], kampanyalar:[
    K({id:'a', ad:'A %10', tip:'sepet_yuzde', deger:10, birlesebilir:true}),
    K({id:'b', ad:'B %5', tip:'sepet_yuzde', deger:5, birlesebilir:true}),
  ]})
  esit('açık+açık → toplanır', [s.uygulananlar.length, s.indirimToplami], [2, 157.46])
}
// 13) TAVAN: birleşebilir %25+%20 = %45 → %35'e kırpılır
{
  const s = sepetHesabi({ kalemler:[kolye,kupe], kampanyalar:[
    K({id:'a', ad:'A %25', tip:'sepet_yuzde', deger:25, birlesebilir:true}),
    K({id:'b', ad:'B %20', tip:'sepet_yuzde', deger:20, birlesebilir:true}),
  ]})
  const araToplam = 1049.70
  esit('tavan %35 kırpması', [s.tavanUygulandi, s.indirimToplami, Math.round(araToplam*INDIRIM_TAVANI_ORANI)/100], [true, 367.40, 367.40])
  esit('tavan sonrası satır toplamı = indirim', Math.round(s.uygulananlar.reduce((t,u)=>t+u.tutar,0)*100)/100, s.indirimToplami)
}
// 14) minSepet koşulu + yaklaşan mesajı
{
  const s = sepetHesabi({ kalemler:[kolye], kampanyalar:[K({id:'a', ad:'500₺ üzeri %30', tip:'sepet_yuzde', deger:30, minSepet:500})]})
  esit('eşik altı indirim yok', s.indirimToplami, 0)
  esit('yaklaşan: 50,10₺ kaldı', [s.yaklasanlar[0]?.kalanTutar, s.yaklasanlar[0]?.oran], [50.10, 30])
}
// 15) İlk alışveriş koşulu
{
  const kamp = [K({id:'a', ad:'Hoş geldin %10', tip:'sepet_yuzde', deger:10, ilkAlisverisMi:true, koduVar:true})]
  const yeni = sepetHesabi({ kalemler:[kolye], kampanyalar:kamp, musteri:{uyeMi:true, oncekiTeslimatVar:false}})
  const eski = sepetHesabi({ kalemler:[kolye], kampanyalar:kamp, musteri:{uyeMi:true, oncekiTeslimatVar:true}})
  esit('ilk alışveriş: yeni müşteri', yeni.indirimToplami, 44.99)
  esit('ilk alışveriş: dönen müşteri', eski.indirimToplami, 0)
}
// 16) Yalnız üyelere
{
  const kamp = [K({id:'a', tip:'sepet_yuzde', deger:10, sadeceUyelere:true})]
  esit('misafir → yok', sepetHesabi({kalemler:[kolye], kampanyalar:kamp, musteri:{uyeMi:false,oncekiTeslimatVar:false}}).indirimToplami, 0)
  esit('üye → var', sepetHesabi({kalemler:[kolye], kampanyalar:kamp, musteri:{uyeMi:true,oncekiTeslimatVar:false}}).indirimToplami, 44.99)
}
// 17) Vitrin görünürlük kuralı
esit('koşulsuz %30 → kartta fiyat', kartFiyatiGosterilsinMi(K({tip:'sepet_yuzde', deger:30})), true)
esit('min 500 → kartta fiyat YOK', kartFiyatiGosterilsinMi(K({tip:'sepet_yuzde', deger:30, minSepet:500})), false)
esit('kategori kapsamı → kartta fiyat YOK', kartFiyatiGosterilsinMi(K({tip:'kapsam_yuzde', kapsam:'kategori', hedefler:['kolye'], deger:20})), false)
esit('X al Y öde → kartta fiyat YOK', kartFiyatiGosterilsinMi(K({tip:'x_al_y_ode', alAdet:3, odeAdet:2})), false)
esit('kupon → kartta fiyat YOK', kartFiyatiGosterilsinMi(K({tip:'sepet_yuzde', deger:10, koduVar:true})), false)
esit('rozet: 500₺ üzeri %30', kosulRozeti(K({tip:'sepet_yuzde', deger:30, minSepet:500})), '500₺ üzeri %30')
esit('rozet: 3 al 2 öde', kosulRozeti(K({tip:'x_al_y_ode', alAdet:3, odeAdet:2})), '3 al 2 öde')
// 18) Toplam = ara toplam − indirim (+kargo)
{
  const s = sepetHesabi({ kalemler:[kolye,kupe,bileklik], kampanyalar:[K({tip:'sepet_yuzde', deger:30})], kargoTutari:0 })
  esit('toplam tutarlılığı', [s.araToplam, s.indirimToplami, s.toplam], [1549.60, 464.88, 1084.72])
}
console.log(`\n  ${gecti} geçti, ${kaldi} kaldı`)
process.exit(kaldi ? 1 : 0)
