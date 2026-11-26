import { readFileSync } from 'node:fs'
import {
  SAYILAN_GRUPLAR,
  TARAYICILAR,
  eslestiriciKalibi,
  sayilirMi,
  tarayiciBul,
  yolOzeti,
  YOL_EN_FAZLA,
} from '../tarayicilar.ts'
import { istanbulGunu, tarayiciOzeti } from '../tarayiciRaporu.ts'

/**
 * Tarayıcı sayacı testleri (24 Kas 2026).
 *
 * İki şey sessizce bozulabilir: (1) bir tarayıcı yanlış gruba düşer ya da hiç
 * tanınmaz, (2) liste değişir ama src/proxy.ts'teki sabit kalıp eski kalır —
 * o zaman yeni ad hiç sayılmaz ve kimse fark etmez. İkisi de burada sınanır.
 *
 * 25 Kas 2026: yalnız asistan grubu sayılıyor. Üçüncü bir şey daha sınanır:
 * eğitim ve arama tarayıcıları kalıptan GEÇMEMELİ — geçerlerse istek katmanı
 * onlar için de çalışır ve ücretsiz plandaki sunucu süresi boşa harcanır.
 */
let gecen = 0
let kalan = 0
const esit = (ad: string, gorulen: unknown, beklenen: unknown) => {
  const tamam = JSON.stringify(gorulen) === JSON.stringify(beklenen)
  if (tamam) gecen++
  else {
    kalan++
    console.error(`✗ ${ad}\n   görülen:  ${JSON.stringify(gorulen)}\n   beklenen: ${JSON.stringify(beklenen)}`)
  }
}

// Gerçek kullanıcı aracısı metinleri (işletmecilerin yayımladığı biçimler).
const UA = {
  oaiSearch:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot',
  chatgptUser: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  perplexity: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  perplexityUser:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)',
  claudeUser: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)',
  claudeBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  gptBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  googlebot:
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  applebot:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
  yandexEk: 'Mozilla/5.0 (compatible; YandexAdditionalBot/3.0; +http://yandex.com/bots)',
  chrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  instagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 380.0.0.31.94 (iPhone15,2; iOS 18_5; tr_TR; tr; scale=3.00; 1179x2556; 742338231)',
  android:
    'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  // Claude masaüstü uygulamasının içindeki tarayıcı: adında "Claude" geçer ama tarayıcı robotu değildir.
  claudeUygulamasi:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Claude/6.28899.6 Chrome/156.0.8078.100 Safari/537.36',
}

// ── 1. Tanıma ve gruplama
const tani = (ua: string | null) => {
  const t = tarayiciBul(ua)
  return t ? `${t.ad}|${t.grup}` : null
}
esit('OAI-SearchBot → asistan', tani(UA.oaiSearch), 'OAI-SearchBot|asistan')
esit('ChatGPT-User → asistan', tani(UA.chatgptUser), 'ChatGPT-User|asistan')
esit('PerplexityBot → asistan', tani(UA.perplexity), 'PerplexityBot|asistan')
esit('Perplexity-User → asistan', tani(UA.perplexityUser), 'Perplexity-User|asistan')
esit('Claude-User → asistan', tani(UA.claudeUser), 'Claude-User|asistan')
esit('ClaudeBot → eğitim', tani(UA.claudeBot), 'ClaudeBot|egitim')
esit('GPTBot → eğitim (ChatGPT-User ile karışmaz)', tani(UA.gptBot), 'GPTBot|egitim')
esit('Googlebot → arama', tani(UA.googlebot), 'Googlebot|arama')
esit('bingbot → arama', tani(UA.bingbot), 'bingbot|arama')
esit('Applebot → asistan', tani(UA.applebot), 'Applebot|asistan')
esit('YandexAdditionalBot → eğitim (YandexBot değil)', tani(UA.yandexEk), 'YandexAdditional|egitim')
esit('büyük-küçük harf: GOOGLEBOT', tani('x GOOGLEBOT/2.1'), 'Googlebot|arama')
esit('sıradan Chrome tanınmaz', tani(UA.chrome), null)
esit('iPhone Safari tanınmaz', tani(UA.iphone), null)
esit('Instagram uygulama içi tarayıcı tanınmaz', tani(UA.instagram), null)
esit('Android Chrome tanınmaz', tani(UA.android), null)
esit('Claude uygulamasının içindeki tarayıcı tanınmaz', tani(UA.claudeUygulamasi), null)
esit('boş kullanıcı aracısı tanınmaz', tani(null), null)

// ── 2. Liste tutarlılığı
const adlar = TARAYICILAR.map((t) => t.ad.toLowerCase())
esit('adlar tekil', new Set(adlar).size, adlar.length)
const golgede: string[] = []
adlar.forEach((kisa, i) => {
  adlar.forEach((uzun, j) => {
    // Kısa ad uzunun içinde geçiyorsa uzun olan ÖNCE gelmeli; yoksa uzun ad hiç bulunmaz.
    if (i !== j && uzun.includes(kisa) && i < j) golgede.push(`${TARAYICILAR[j].ad} ⊃ ${TARAYICILAR[i].ad}`)
  })
})
esit('hiçbir ad bir başkasını gölgelemiyor', golgede, [])
esit(
  'gruplar geçerli',
  TARAYICILAR.filter((t) => !['asistan', 'egitim', 'arama'].includes(t.grup)).map((t) => t.ad),
  []
)

// ── 3. İstek katmanındaki sabit kalıp listeyle aynı mı?
const kaynak = readFileSync(new URL('../../../proxy.ts', import.meta.url), 'utf8')
const eslesme = kaynak.match(/key: 'user-agent',\s*value:\s*'([^']+)'/)
const proxyKalibi = eslesme ? eslesme[1] : null
if (proxyKalibi !== eslestiriciKalibi()) {
  console.error(`\n   src/proxy.ts'e yazılması gereken kalıp:\n   ${eslestiriciKalibi()}\n`)
}
esit('proxy.ts kalıbı listeyle birebir aynı', proxyKalibi === eslestiriciKalibi(), true)

// Next, değeri baştan sona eşleştirir (^…$).
const kalip = new RegExp(`^${eslestiriciKalibi()}$`)
const ornek = (ad: string) => `Mozilla/5.0 (compatible; ${ad}/1.0; +https://ornek.invalid/bot)`
esit('sayılan gruplar: yalnız asistan', [...SAYILAN_GRUPLAR], ['asistan'])
esit(
  'sayılan gruptaki her ad kalıptan geçer',
  TARAYICILAR.filter((t) => sayilirMi(t) && !kalip.test(ornek(t.ad))).map((t) => t.ad),
  []
)
esit(
  'sayılmayan gruplardaki hiçbir ad kalıptan GEÇMEZ (katman onlar için çalışmaz)',
  TARAYICILAR.filter((t) => !sayilirMi(t) && kalip.test(ornek(t.ad))).map((t) => t.ad),
  []
)
esit(
  'gerçek asistan metinleri kalıptan geçer',
  [UA.oaiSearch, UA.chatgptUser, UA.perplexity, UA.perplexityUser, UA.claudeUser, UA.applebot].filter((u) => !kalip.test(u)),
  []
)
esit(
  'gerçek eğitim ve arama tarayıcısı metinleri kalıptan GEÇMEZ',
  [UA.claudeBot, UA.gptBot, UA.googlebot, UA.bingbot, UA.yandexEk].filter((u) => kalip.test(u)),
  []
)
esit('sayilirMi: asistan sayılır', sayilirMi(tarayiciBul(UA.oaiSearch)), true)
esit('sayilirMi: eğitim tarayıcısı sayılmaz', sayilirMi(tarayiciBul(UA.gptBot)), false)
esit('sayilirMi: arama motoru sayılmaz', sayilirMi(tarayiciBul(UA.googlebot)), false)
esit('sayilirMi: tanınmayan sayılmaz', sayilirMi(tarayiciBul(UA.chrome)), false)
esit('sayilirMi: boş değer sayılmaz', sayilirMi(null), false)
esit(
  'insan tarayıcıları kalıptan GEÇMEZ (katman onlar için çalışmaz)',
  [UA.chrome, UA.iphone, UA.instagram, UA.android, UA.claudeUygulamasi].filter((u) => kalip.test(u)),
  []
)
// Kalıptan geçen her şeyi sınıflandırıcı da tanımalı: aksi hâlde katman boşuna çalışır.
esit(
  'kalıptan geçen örnekleri sınıflandırıcı da tanır',
  TARAYICILAR.filter((t) => tarayiciBul(ornek(t.ad))?.ad !== t.ad).map((t) => t.ad),
  []
)

// ── 4. Adres özeti
esit('sorgu atılır', yolOzeti('/urun/kolye-NBK024?utm_source=x&e=a@b.c', 'asistan'), '/urun/kolye-NBK024')
esit('sondaki eğik çizgi atılır', yolOzeti('/blog/', 'egitim'), '/blog')
esit('kök adres', yolOzeti('/', 'asistan'), '/')
esit('boş adres kök sayılır', yolOzeti('', 'asistan'), '/')
esit('arama motorunda ürün sayfaları tek satır', yolOzeti('/urun/kolye-NBK024', 'arama'), '/urun/*')
esit('arama motorunda diğer sayfalar olduğu gibi', yolOzeti('/kategori/kolye', 'arama'), '/kategori/kolye')
esit('asistanda ürün sayfası olduğu gibi', yolOzeti('/urun/kolye-NBK024', 'asistan'), '/urun/kolye-NBK024')
esit('uzun adres kırpılır', yolOzeti('/' + 'a'.repeat(400), 'asistan').length, YOL_EN_FAZLA)

// ── 5. Panel özeti
const ozet = tarayiciOzeti([
  { gun: '2026-11-24', tarayici: 'OAI-SearchBot', grup: 'asistan', yol: '/koleksiyon/316l-celik-takilar', adet: 3, son_gorulme: '2026-11-24T10:00:00Z' },
  { gun: '2026-11-25', tarayici: 'OAI-SearchBot', grup: 'asistan', yol: '/llms.txt', adet: 2, son_gorulme: '2026-11-25T08:00:00Z' },
  { gun: '2026-11-24', tarayici: 'GPTBot', grup: 'egitim', yol: '/llms.txt', adet: 4, son_gorulme: '2026-11-24T09:00:00Z' },
  { gun: '2026-11-24', tarayici: 'GPTBot', grup: 'egitim', yol: '(diğer)', adet: 9, son_gorulme: '2026-11-24T11:00:00Z' },
  { gun: '2026-11-24', tarayici: 'Googlebot', grup: 'arama', yol: '/urun/*', adet: 120, son_gorulme: '2026-11-24T12:00:00Z' },
  { gun: '2026-11-24', tarayici: 'Bilinmeyen', grup: 'baska', yol: '/', adet: 50, son_gorulme: null },
  { gun: '2026-11-24', tarayici: 'PerplexityBot', grup: 'asistan', yol: '/', adet: 0, son_gorulme: null },
])
esit('toplamlar gruba göre', ozet.toplam, { asistan: 5, egitim: 13, arama: 120 })
esit(
  'tarayıcı sırası: asistan → eğitim → arama',
  ozet.tarayicilar.map((t) => `${t.ad}:${t.ziyaret}`),
  ['OAI-SearchBot:5', 'GPTBot:13', 'Googlebot:120']
)
esit('son görülme en yeni olan', ozet.tarayicilar[0].sonGorulme, '2026-11-25T08:00:00Z')
esit('işletmeci listeden gelir', ozet.tarayicilar[0].isletmeci, 'OpenAI (ChatGPT araması)')
esit(
  'sayfalar: yalnız sayılan grup (asistan), "(diğer)" hariç, çoktan aza',
  ozet.sayfalar,
  [
    { yol: '/koleksiyon/316l-celik-takilar', ziyaret: 3 },
    { yol: '/llms.txt', ziyaret: 2 },
  ]
)
// Grup listesi elle verilirse o gruplar toplanır; arama motoru hiçbir durumda girmez.
esit(
  'sayfalar: gruplar elle verilince (asistan + eğitim + arama) arama yine dışarıda',
  tarayiciOzeti(
    [
      { gun: '2026-11-24', tarayici: 'OAI-SearchBot', grup: 'asistan', yol: '/llms.txt', adet: 2, son_gorulme: null },
      { gun: '2026-11-24', tarayici: 'GPTBot', grup: 'egitim', yol: '/llms.txt', adet: 4, son_gorulme: null },
      { gun: '2026-11-24', tarayici: 'Googlebot', grup: 'arama', yol: '/urun/*', adet: 120, son_gorulme: null },
    ],
    5,
    ['asistan', 'egitim', 'arama']
  ).sayfalar,
  [{ yol: '/llms.txt', ziyaret: 6 }]
)
esit('İstanbul günü: UTC 21:30 ertesi gündür', istanbulGunu(new Date('2026-11-24T21:30:00Z')), '2026-11-25')
esit('İstanbul günü: UTC 20:59 aynı gündür', istanbulGunu(new Date('2026-11-24T20:59:00Z')), '2026-11-24')

console.log(`\n  ${gecen} geçti, ${kalan} kaldı`)
process.exit(kalan ? 1 : 0)
