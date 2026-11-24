/** Tosla kartla ödeme · imza, karar, iade kuralları, adres denetimi (12 Kas 2026). */
import { createHash } from 'node:crypto'
import {
  istekImzasi,
  kurusa,
  sorguyuYorumla,
  toslaZamani,
  donusImzasiDogru,
  kartOdemesiKimligi,
  kartOdemesiAcikMi,
  toslaOdemesiMi,
  toslaSiparisNo,
  type ToslaKimlik,
} from '@/lib/tosla/client'
import {
  KART_SIPARIS_DESENI,
  ayniTrGunu,
  kalemIadePayi,
  kararVer,
  kartOdemesiniGeriVer,
} from '@/lib/tosla/kartOdemesi'
import { toslaOdemeSayfasiMi } from '@/lib/tosla/ortak'
import { kaynakGrubu } from '@/lib/analytics/kaynak'
import { odemeCevabi, sssTamami } from '@/lib/legal/sss'

let gecti = 0
let kaldi = 0
const esit = (ad: string, bulunan: unknown, beklenen: unknown) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen)
  console.log(`  ${ok ? '✓' : '✗'} ${ad}${ok ? '' : ` → ${JSON.stringify(bulunan)} (beklenen ${JSON.stringify(beklenen)})`}`)
  ok ? gecti++ : kaldi++
}
const hataVerir = async (ad: string, is: () => Promise<unknown>, icerir: string) => {
  try {
    await is()
    esit(ad, 'hata yok', `hata: ${icerir}`)
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    esit(ad, m.includes(icerir) ? icerir : m, icerir)
  }
}

// Belgedeki herkese açık deneme üye işyeri (gizli değil).
const K: ToslaKimlik = { ortam: 'test', clientId: '1000000494', apiUser: 'POS_ENT_Test_001', apiPass: 'POS_ENT_Test_001!*!*' }

console.log('istek imzası')
const beklenenImza = createHash('sha512')
  .update(K.apiPass + K.clientId + K.apiUser + 'abc123' + '20261112153000', 'utf8')
  .digest('base64')
esit('SHA512(ApiPass+ClientId+ApiUser+Rnd+TimeSpan) Base64', istekImzasi(K, 'abc123', '20261112153000'), beklenenImza)

console.log('zaman ve tutar')
esit('Türkiye saati (UTC+3)', toslaZamani(new Date('2026-11-12T21:30:05Z')), '20261113003005')
esit('kuruş: 1234,5 TL', kurusa(1234.5), 123450)
esit('kuruş: kayan nokta (0,1+0,2)', kurusa(0.1 + 0.2), 30)
esit('kuruş: 19,99 TL', kurusa(19.99), 1999)

console.log('sorgu yorumu')
const sorgu = (ek: Record<string, unknown>) => sorguyuYorumla({ Code: 0, OrderId: 'NBS-1', Currency: 949, ...ek })
esit('1 + 00 → ödendi', sorgu({ RequestStatus: 1, BankResponseCode: '00', Amount: 12345 }).durum, 'odendi')
esit('1 + 05 → başarısız', sorgu({ RequestStatus: 1, BankResponseCode: '05' }).durum, 'basarisiz')
esit('0 → başarısız', sorgu({ RequestStatus: 0 }).durum, 'basarisiz')
esit('10/11/12 → bekliyor', [10, 11, 12].map((r) => sorgu({ RequestStatus: r }).durum), ['bekliyor', 'bekliyor', 'bekliyor'])
esit('2 → iptal', sorgu({ RequestStatus: 2 }).durum, 'iptal')
esit('4 → iade', sorgu({ RequestStatus: 4 }).durum, 'iade')
esit('6 → itiraz', sorgu({ RequestStatus: 6 }).durum, 'itiraz')
esit('bilinmeyen → bilinmiyor', sorgu({ RequestStatus: 99 }).durum, 'bilinmiyor')
esit('işlem no 0 → yok sayılır', sorgu({ RequestStatus: 1, BankResponseCode: '00', TransactionId: '0' }).islemNo, null)
esit('camelCase alan adları da okunur', sorguyuYorumla({ requestStatus: 1, bankResponseCode: '00', amount: 500 }).tutarKurus, 500)

console.log('karar')
const q = (ek: Partial<ReturnType<typeof sorguyuYorumla>>) => ({ ...sorgu({ RequestStatus: 1, BankResponseCode: '00', Amount: 12345 }), ...ek })
esit('tutar birebir → öde', kararVer(123.45, q({})).tur, 'ode')
esit('1 kuruş eksik → inceleme', kararVer(123.45, q({ tutarKurus: 12344 })).tur, 'inceleme')
esit('başka para birimi → inceleme', kararVer(123.45, q({ paraBirimi: 840 })).tur, 'inceleme')
esit('bekliyor → bekle', kararVer(123.45, q({ durum: 'bekliyor' })).tur, 'bekle')
esit('bulunamadı → bekle (Tosla henüz görmüyor)', kararVer(123.45, q({ durum: 'bulunamadi' })).tur, 'bekle')
esit('başarısız → başarısız', kararVer(123.45, q({ durum: 'basarisiz' })).tur, 'basarisiz')
esit('iade durumu → inceleme', kararVer(123.45, q({ durum: 'iade' })).tur, 'inceleme')

console.log('dönüş imzası')
const donus: Record<string, string> = {
  ClientId: K.clientId, ApiUser: K.apiUser, OrderId: 'NBS-1762960000000', MdStatus: '1',
  BankResponseCode: '00', BankResponseMessage: 'Onaylandı', RequestStatus: '1',
}
const donusHash = createHash('sha512')
  .update(K.apiPass + K.clientId + K.apiUser + donus.OrderId + '1' + '00' + 'Onaylandı' + '1', 'utf8')
  .digest('base64')
esit('belgedeki sırayla doğru imza', donusImzasiDogru(K, { ...donus, Hash: donusHash }), true)
esit('tek alan değişince tutmaz', donusImzasiDogru(K, { ...donus, RequestStatus: '0', Hash: donusHash }), false)
esit('imza yoksa tutmaz', donusImzasiDogru(K, donus), false)

console.log('kart anahtarı')
const env = { TOSLA_CLIENT_ID: K.clientId, TOSLA_API_USER: K.apiUser, TOSLA_API_PASS: K.apiPass, TOSLA_ORTAM: 'test' }
esit('kimlik var, anahtar kapalı → kapalı', kartOdemesiAcikMi(env), false)
esit('anahtar "evet" → açık', kartOdemesiAcikMi({ ...env, TOSLA_ODEME_ACIK: 'evet' }), true)
esit('anahtar açık ama kimlik eksik → kapalı', kartOdemesiAcikMi({ TOSLA_ODEME_ACIK: 'evet', TOSLA_CLIENT_ID: K.clientId }), false)
esit('ortam yazılmazsa canlı', kartOdemesiKimligi({ ...env, TOSLA_ORTAM: undefined, TOSLA_ODEME_ACIK: 'evet' })?.ortam, 'canli')

console.log('ödeme kimliği ve sipariş numarası')
esit('tosla: öneki tanınır', toslaOdemesiMi('tosla:NBS-1762960000000'), true)
esit('eski iyzico kimliği tosla değildir', toslaOdemesiMi('23456789'), false)
esit('önekten sipariş no', toslaSiparisNo('tosla:NBS-1762960000000'), 'NBS-1762960000000')
esit('NBS-<13 hane> geçerli', KART_SIPARIS_DESENI.test('NBS-1762960000000'), true)
esit('fazladan karakter geçmez', KART_SIPARIS_DESENI.test('NBS-1762960000000x'), false)

console.log('yönlendirme adresi')
esit('canlı ödeme sayfası', toslaOdemeSayfasiMi('https://entegrasyon.tosla.com/api/Payment/threeDSecure/abc'), true)
esit('deneme ödeme sayfası', toslaOdemeSayfasiMi('https://prepentegrasyon.tosla.com/api/Payment/threeDSecure/abc'), true)
esit('şifresiz bağlantı reddedilir', toslaOdemeSayfasiMi('http://entegrasyon.tosla.com/x'), false)
esit('benzer alan adı reddedilir', toslaOdemeSayfasiMi('https://tosla.com.kotu.example/x'), false)
esit('önek benzerliği reddedilir', toslaOdemeSayfasiMi('https://kotutosla.com/x'), false)
esit('kullanıcı adlı adres reddedilir', toslaOdemeSayfasiMi('https://a:b@entegrasyon.tosla.com/x'), false)
esit('betik adresi reddedilir', toslaOdemeSayfasiMi('javascript:alert(1)'), false)
esit('metin olmayan reddedilir', toslaOdemeSayfasiMi(null), false)

console.log('kalem iadesi payı')
esit('indirim kalemlere oranla dağılır', kalemIadePayi({ kalemBrut: 100, kalanKalemlerBrut: 300, odenenToplam: 240, kargo: 0 }), 80)
esit('ücretli kargo iade edilmez', kalemIadePayi({ kalemBrut: 100, kalanKalemlerBrut: 300, odenenToplam: 270, kargo: 30 }), 80)
esit('pay ödenenden büyük olamaz', kalemIadePayi({ kalemBrut: 300, kalanKalemlerBrut: 300, odenenToplam: 240, kargo: 0 }), 240)
esit('boş sepette 0', kalemIadePayi({ kalemBrut: 100, kalanKalemlerBrut: 0, odenenToplam: 240, kargo: 0 }), 0)

console.log('Türkiye günü')
esit('23.59 ile 00.01 farklı gün', ayniTrGunu(new Date('2026-11-12T20:59:00Z'), new Date('2026-11-12T21:01:00Z')), false)
esit('aynı TR günü', ayniTrGunu(new Date('2026-11-12T10:00:00Z'), new Date('2026-11-12T20:00:00Z')), true)

// ── İade: karar Tosla'nın kaydına göre ──────────────────────────────────
console.log('iade (sahte Tosla)')
type Cagri = { yontem: string; govde: Record<string, unknown> }
const sahteTosla = (sorguYaniti: Record<string, unknown>, islemYaniti: Record<string, unknown> = { Code: 0, BankResponseCode: '00', TransactionId: '77' }) => {
  const cagrilar: Cagri[] = []
  const fetchImpl = async (url: string, init: RequestInit) => {
    const yontem = url.split('/').pop() ?? ''
    cagrilar.push({ yontem, govde: JSON.parse(String(init.body)) })
    const yanit = yontem === 'inquiry' ? { Code: 0, OrderId: 'NBS-1762960000000', Currency: 949, ...sorguYaniti } : islemYaniti
    return new Response(JSON.stringify(yanit), { status: 200 })
  }
  return { fetchImpl, cagrilar }
}
const siparis = (total: number, odendiAt = '2026-11-12T09:00:00Z') => ({
  order_number: 'NBS-1762960000000',
  total,
  metadata: { kart: { odendi_at: odendiAt } },
})
const ayniGun = new Date('2026-11-12T15:00:00Z')
const ertesiGun = new Date('2026-11-13T15:00:00Z')

{
  const t = sahteTosla({ RequestStatus: 1, BankResponseCode: '00', Amount: 24000, RefundedAmount: 0 })
  const r = await kartOdemesiniGeriVer(K, siparis(240), { simdi: ayniGun, fetchImpl: t.fetchImpl })
  esit('aynı gün tam tutar → önce sorgu, sonra iptal', [t.cagrilar.map((c) => c.yontem), r.yol], [['inquiry', 'void'], 'iptal'])
}
{
  const t = sahteTosla({ RequestStatus: 1, BankResponseCode: '00', Amount: 24000, RefundedAmount: 0 })
  const r = await kartOdemesiniGeriVer(K, siparis(240), { simdi: ertesiGun, fetchImpl: t.fetchImpl })
  esit('ertesi gün tam tutar → iade', [t.cagrilar.map((c) => c.yontem), r.yol, t.cagrilar[1]?.govde.amount], [['inquiry', 'refund'], 'iade', 24000])
}
{
  const t = sahteTosla({ RequestStatus: 1, BankResponseCode: '00', Amount: 24000, RefundedAmount: 0 })
  const r = await kartOdemesiniGeriVer(K, siparis(240), { tutarTl: 80, simdi: ayniGun, fetchImpl: t.fetchImpl })
  esit('kısmi tutar aynı gün bile iptal DEĞİL, iade', [t.cagrilar.map((c) => c.yontem), r.yol, t.cagrilar[1]?.govde.amount], [['inquiry', 'refund'], 'iade', 8000])
}
{
  // Kalem iptalinden sonra: Tosla'da 80 TL iade görünüyor, sipariş toplamı 160.
  const t = sahteTosla({ RequestStatus: 4, Amount: 24000, RefundedAmount: 8000 })
  const r = await kartOdemesiniGeriVer(K, siparis(160), { simdi: ayniGun, fetchImpl: t.fetchImpl })
  esit('önceki kısmi iadeden sonra kalan → iade (iptal değil)', [t.cagrilar.map((c) => c.yontem), r.yol, t.cagrilar[1]?.govde.amount], [['inquiry', 'refund'], 'iade', 16000])
}
{
  // Sitede görünmeyen bir iade: Tosla 80 TL iade etmiş, sipariş hâlâ 240.
  const t = sahteTosla({ RequestStatus: 4, Amount: 24000, RefundedAmount: 8000 })
  await hataVerir('kayıt uyuşmazlığında iade durur', () => kartOdemesiniGeriVer(K, siparis(240), { simdi: ertesiGun, fetchImpl: t.fetchImpl }), 'uyuşmuyor')
  esit('uyuşmazlıkta Tosla\'ya iade isteği gitmez', t.cagrilar.map((c) => c.yontem), ['inquiry'])
}
{
  const t = sahteTosla({ RequestStatus: 2, Amount: 24000, RefundedAmount: 0 })
  const r = await kartOdemesiniGeriVer(K, siparis(240), { simdi: ayniGun, fetchImpl: t.fetchImpl })
  esit('zaten iptal edilmiş → yeniden istek yok, başarı', [t.cagrilar.map((c) => c.yontem), r.yol, r.zaten], [['inquiry'], 'iptal', true])
}
{
  const t = sahteTosla({ RequestStatus: 3, Amount: 24000, RefundedAmount: 24000 })
  const r = await kartOdemesiniGeriVer(K, siparis(240), { simdi: ertesiGun, fetchImpl: t.fetchImpl })
  esit('tamamı zaten iade edilmiş → yeniden istek yok', [t.cagrilar.map((c) => c.yontem), r.zaten], [['inquiry'], true])
}
{
  const t = sahteTosla({ RequestStatus: 1, BankResponseCode: '00', Amount: 24000, RefundedAmount: 0 })
  await hataVerir('kalandan fazlası istenemez', () => kartOdemesiniGeriVer(K, siparis(240), { tutarTl: 300, fetchImpl: t.fetchImpl }), 'aşıyor')
}
{
  const t = sahteTosla({ RequestStatus: 6, Amount: 24000 })
  await hataVerir('itirazlı ödemede iade yapılmaz', () => kartOdemesiniGeriVer(K, siparis(240), { fetchImpl: t.fetchImpl }), 'itiraz')
}
{
  // Gün sonu alınmış: iptal açıkça reddedilir → aynı tutar iade olarak gider.
  const t = sahteTosla({ RequestStatus: 1, BankResponseCode: '00', Amount: 24000, RefundedAmount: 0 }, { Code: 0, BankResponseCode: '00', TransactionId: '78' })
  let ilkIslem = true
  const fetchImpl = async (url: string, init: RequestInit) => {
    const yontem = url.split('/').pop() ?? ''
    if (yontem === 'void' && ilkIslem) {
      ilkIslem = false
      t.cagrilar.push({ yontem, govde: JSON.parse(String(init.body)) })
      return new Response(JSON.stringify({ Code: 0, BankResponseCode: '99', BankResponseMessage: 'Gün sonu alınmış' }), { status: 200 })
    }
    return t.fetchImpl(url, init)
  }
  const r = await kartOdemesiniGeriVer(K, siparis(240), { simdi: ayniGun, fetchImpl })
  esit('iptal reddedilince iade', [t.cagrilar.map((c) => c.yontem), r.yol], [['inquiry', 'void', 'refund'], 'iade'])
}
{
  // Ağ koptu: iptal Tosla'da olmuş olabilir — körlemesine iade istenmez.
  const t = sahteTosla({ RequestStatus: 1, BankResponseCode: '00', Amount: 24000, RefundedAmount: 0 })
  const fetchImpl = async (url: string, init: RequestInit) => {
    if (url.endsWith('void')) throw new Error('bağlantı koptu')
    return t.fetchImpl(url, init)
  }
  await hataVerir('iptalde ağ hatası → iade denenmez, hata yukarı çıkar', () => kartOdemesiniGeriVer(K, siparis(240), { simdi: ayniGun, fetchImpl }), 'ulaşılamadı')
  esit('ağ hatasında iade isteği gitmedi', t.cagrilar.map((c) => c.yontem), ['inquiry'])
}

console.log('site metinleri')
esit('Tosla dönüşü trafik kaynağı sayılmaz', kaynakGrubu('entegrasyon.tosla.com'), 'ic')
esit('SSS: kart kapalıyken havale metni', odemeCevabi(false).startsWith('Şu an ödemeler havale/EFT ile'), true)
esit('SSS: kart açıkken iki yol', odemeCevabi(true).startsWith('Kartla ya da havale/EFT ile'), true)
// 24 Kas 2026'da ödeme sorusunun ardına taksit sorusu eklendi; liste bu ikisiyle biter.
esit('SSS listesi ödeme ve taksit sorusuyla biter', sssTamami(true).slice(-2).map((s) => s.soru), ['Nasıl ödeme yapabilirim?', 'Taksit ya da kapıda ödeme var mı?'])

console.log(`\n${gecti} geçti, ${kaldi} kaldı`)
if (kaldi > 0) process.exit(1)
