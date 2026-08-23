/** Faz 25 · kupon kutusunun söylediği cümleler. */
import { kuponMesaji, kuponMesajTonu, type KuponDurumu } from '@/lib/campaigns/kuponMesaji'

let gecti = 0
let kaldi = 0
const esit = (ad: string, bulunan: unknown, beklenen: unknown) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`  ${ok ? '✓' : '✗'} ${ad}`)
  if (!ok) console.log(`      bulunan : ${JSON.stringify(bulunan)}\n      beklenen: ${JSON.stringify(beklenen)}`)
  ok ? gecti++ : kaldi++
}

// BB'nin istediği dört senaryo, birebir
esit(
  'ilk alışveriş koşuluna takıldı',
  kuponMesaji({ tip: 'uygun_degil', sebep: 'Yalnız ilk alışverişte geçerli' }),
  'Bu kod ilk siparişlere özel. Size özel indirimleri e-posta ile gönderiyoruz.'
)
esit('süresi dolmuş', kuponMesaji({ tip: 'suresi_dolmus' }), 'Bu kodun süresi dolmuş.')
esit(
  'daha yüksek kampanya var — kupon HARCANMAZ',
  kuponMesaji({ tip: 'golgelendi', kazananAd: 'NB30' }),
  'Sepetinizde daha avantajlı bir kampanya uygulanıyor — bu kod kullanılmadı, saklı kalır.'
)
esit('geçersiz kod', kuponMesaji({ tip: 'bulunamadi' }), 'Bu kodu bulamadık, kontrol eder misiniz?')

// Diğer durumlar
esit('henüz başlamadı ≠ süresi dolmuş', kuponMesaji({ tip: 'baslamadi' }), 'Bu kod henüz kullanıma açılmadı.')
esit(
  'yalnız üyelere',
  kuponMesaji({ tip: 'uygun_degil', sebep: 'Yalnız üyelere özel' }),
  'Bu kod yalnız üyelere özel. Giriş yaptıktan sonra tekrar deneyin.'
)
esit(
  'sepet alt sınırı — eksik tutar yazılır',
  kuponMesaji({ tip: 'uygun_degil', sebep: 'Sepet tutarı yetersiz', eksikTutar: 150.5 }),
  'Bu kod için sepetinize 150,50 ₺ daha eklemeniz gerekiyor.'
)
esit(
  'tanımadığımız sebep — uydurma yok',
  kuponMesaji({ tip: 'uygun_degil', sebep: 'Bilinmeyen bir şey' }),
  'Bu kod sepetinizde geçerli değil.'
)
esit('kupon uygulandı → uyarı yok', kuponMesaji({ tip: 'uygulandi' }), null)
esit('zaten otomatik kampanya → uyarı yok', kuponMesaji({ tip: 'zaten_otomatik' }), null)

// Ton
esit('gölgelendi bilgi tonunda (kırmızı değil)', kuponMesajTonu({ tip: 'golgelendi' }), 'bilgi')
esit('geçersiz kod uyarı tonunda', kuponMesajTonu({ tip: 'bulunamadi' }), 'uyari')

// Marka sesi: ünlem ve emoji yasak
const hepsi: KuponDurumu[] = [
  { tip: 'bulunamadi' },
  { tip: 'suresi_dolmus' },
  { tip: 'baslamadi' },
  { tip: 'kapali' },
  { tip: 'golgelendi' },
  { tip: 'uygun_degil', sebep: 'Yalnız ilk alışverişte geçerli' },
  { tip: 'uygun_degil', sebep: 'Yalnız üyelere özel' },
  { tip: 'uygun_degil', sebep: 'Sepet tutarı yetersiz', eksikTutar: 10 },
  { tip: 'uygun_degil' },
]
const metinler = hepsi.map((d) => kuponMesaji(d)!).filter(Boolean)
esit('hiçbir mesajda ünlem yok', metinler.some((m) => m.includes('!')), false)
esit(
  'hiçbir mesajda emoji yok',
  metinler.some((m) => /\p{Extended_Pictographic}/u.test(m)),
  false
)
esit('hepsi nokta ile bitiyor', metinler.every((m) => m.trim().endsWith('.') || m.trim().endsWith('?')), true)

console.log(`\n  ${gecti} geçti, ${kaldi} kaldı`)
process.exit(kaldi ? 1 : 0)
