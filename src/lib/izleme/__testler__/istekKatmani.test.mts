import { AsyncLocalStorage } from 'node:async_hooks'

// Next'in sunucu modülleri bu genel değişkeni kendi çalışma ortamında kurar;
// düz Node'da elle kurulur ve modüller ONDAN SONRA yüklenir (bu yüzden
// aşağıdaki içe aktarmalar dinamik).
;(globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage
const { NextRequest } = await import('next/server')
type Eslestirici = (a: { config: unknown; nextConfig: unknown; url: string; headers?: Record<string, string> }) => boolean
type NextTest = {
  isRewrite: (yanit: Response) => boolean
  getRewrittenUrl: (yanit: Response) => string | null
  getRedirectUrl: (yanit: Response) => string | null
  unstable_doesProxyMatch?: Eslestirici
  unstable_doesMiddlewareMatch?: Eslestirici
}
const nextTestModulu = (await import('next/experimental/testing/server')) as unknown as NextTest & { default?: NextTest }
const nextTest = nextTestModulu.default ?? nextTestModulu
const { proxy, config } = await import('../../../proxy.ts')
const { yayindakiPaylasimlar } = await import('../../instagram/paylasimlar.ts')

/**
 * İstek katmanı (src/proxy.ts) testleri — tarayıcı sayacı eklendiğinde yazıldı
 * (24 Kas 2026).
 *
 * Katman 14 Kas'tan beri yalnız birkaç yolda çalışıyordu; sayaç onu yapay zekâ
 * tarayıcılarının isteklerine de açtı. 25 Kas 2026'dan beri yalnız ASİSTANLARA
 * açık: katman çağrı başına ~0,18 sn sunucu süresi harcıyor ve isteklerin onda
 * dokuzu eğitim tarayıcıları ile arama motorlarıydı. Burada sınananlar:
 *  1. İnsan ziyaretçinin vitrin isteği katmana HİÇ gelmiyor (ücretsiz plandaki
 *     sunucu süresi sınırı — 10 Kas'ta site bu yüzden kapanmıştı).
 *  2. Eğitim tarayıcısının ve arama motorunun vitrin isteği de katmana gelmiyor;
 *     gelse bile sayılmıyor.
 *  3. Asistan isteği dokunulmadan geçiyor: yönlendirme yok, güvenlik politikası
 *     başlığı yok, ana sayfa Instagram seçkisine ÇEVRİLMİYOR.
 *  4. Eski davranış aynı: panel kapısı, /admin yönlendirmesi, nonce'lu yollar.
 */
// CommonJS paketi: adlı içe aktarma çalışmıyor, varsayılan nesneden alınır.
const { isRewrite, getRewrittenUrl, getRedirectUrl } = nextTest
// Next sürümüne göre ad değişiyor (16.x'te hâlâ eski ad).
const eslesirMi = (nextTest.unstable_doesProxyMatch ?? nextTest.unstable_doesMiddlewareMatch) as Eslestirici

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

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const OAI = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot'
const GOOGLEBOT =
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const GPTBOT = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot'

// ── 1. Eşleştirici: katman kimin isteğinde çalışır?
const calisir = (url: string, ua: string) =>
  eslesirMi({ config, nextConfig: {}, url, headers: { 'user-agent': ua } })

for (const ua of [CHROME, IPHONE]) {
  const kim = ua === CHROME ? 'Chrome' : 'iPhone'
  esit(`${kim}: ana sayfa → katman çalışmaz`, calisir('/', ua), false)
  esit(`${kim}: ürün sayfası → çalışmaz`, calisir('/urun/kolye-NBK024', ua), false)
  esit(`${kim}: koleksiyon → çalışmaz`, calisir('/koleksiyon/316l-celik-takilar', ua), false)
  esit(`${kim}: blog → çalışmaz`, calisir('/blog/celik-taki-kararir-mi', ua), false)
  esit(`${kim}: llms.txt → çalışmaz`, calisir('/llms.txt', ua), false)
  esit(`${kim}: panel → çalışır (oturum kapısı)`, calisir('/panel/siparisler', ua), true)
  esit(`${kim}: ödeme → çalışır (nonce)`, calisir('/odeme', ua), true)
  esit(`${kim}: Instagram'dan ana sayfa → çalışır`, calisir('/?utm_source=instagram', ua), true)
}
esit('asistan tarayıcısı: ürün sayfası → çalışır', calisir('/urun/kolye-NBK024', OAI), true)
esit('asistan tarayıcısı: ana sayfa → çalışır', calisir('/', OAI), true)
esit('asistan tarayıcısı: llms.txt → çalışır', calisir('/llms.txt', OAI), true)
esit('asistan tarayıcısı: site haritası → çalışır', calisir('/sitemap.xml', OAI), true)
esit('asistan tarayıcısı: kategori → çalışır', calisir('/kategori/kolye', OAI), true)
esit('asistan tarayıcısı: betik dosyası → çalışmaz', calisir('/_next/static/chunks/main-abc.js', OAI), false)
esit('asistan tarayıcısı: görsel iyileştirme → çalışmaz', calisir('/_next/image?url=x&w=640&q=75', OAI), false)
esit('asistan tarayıcısı: görsel dosyası → çalışmaz', calisir('/badges/visa.svg', OAI), false)
esit('asistan tarayıcısı: /api → çalışmaz', calisir('/api/search?q=kolye', OAI), false)
esit('asistan tarayıcısı: site simgesi → çalışmaz', calisir('/favicon.ico', OAI), false)
// 25 Kas 2026: eğitim tarayıcıları ve arama motorları vitrinde katmanı ÇALIŞTIRMAZ.
// Günde ~500 istek onlardandı; her biri ~0,18 sn sunucu süresi demekti.
for (const [kim, ua] of [
  ['Googlebot', GOOGLEBOT],
  ['GPTBot', GPTBOT],
] as const) {
  esit(`${kim}: ana sayfa → çalışmaz`, calisir('/', ua), false)
  esit(`${kim}: ürün sayfası → çalışmaz`, calisir('/urun/kolye-NBK024', ua), false)
  esit(`${kim}: kategori → çalışmaz`, calisir('/kategori/kolye', ua), false)
  esit(`${kim}: blog → çalışmaz`, calisir('/blog/celik-taki-kararir-mi', ua), false)
  esit(`${kim}: llms.txt → çalışmaz`, calisir('/llms.txt', ua), false)
  esit(`${kim}: site haritası → çalışmaz`, calisir('/sitemap.xml', ua), false)
  esit(`${kim}: robots.txt → çalışmaz`, calisir('/robots.txt', ua), false)
  esit(`${kim}: panel → çalışır (oturum kapısı herkese)`, calisir('/panel', ua), true)
}

// ── 2. İşlev: istek geldiğinde ne yapar?
type Sonuc = { tur: string; hedef: string | null; csp: boolean; onbellek: string | null; isaret: string | null; yazim: number }
async function dene(yol: string, ua: string, cerez?: string): Promise<Sonuc> {
  let yazim = 0
  const olay = { waitUntil: (p: Promise<unknown>) => { yazim++; void p } } as unknown as Parameters<typeof proxy>[1]
  const basliklar: Record<string, string> = { 'user-agent': ua }
  if (cerez) basliklar.cookie = cerez
  const yanit = await proxy(new NextRequest(`https://www.nbsteelora.com${yol}`, { headers: basliklar }), olay)
  const yonlendirme = getRedirectUrl(yanit)
  const tur = yonlendirme ? `yonlendirme:${yanit.status}` : isRewrite(yanit) ? 'cevirme' : 'gecir'
  const hedef = yonlendirme ?? (isRewrite(yanit) ? getRewrittenUrl(yanit) : null)
  return {
    tur,
    hedef: hedef ? new URL(hedef).pathname + new URL(hedef).search : null,
    csp: yanit.headers.has('content-security-policy'),
    onbellek: yanit.headers.get('cache-control'),
    isaret: yanit.headers.get('x-nb-tarayici'),
    yazim,
  }
}

const dokunulmadi = (isaret: string) => ({ tur: 'gecir', hedef: null, csp: false, onbellek: null, isaret, yazim: 1 })
const sayilmadi = { tur: 'gecir', hedef: null, csp: false, onbellek: null, isaret: null, yazim: 0 }
esit('asistan → ürün sayfası: dokunulmadan geçer, sayılır', await dene('/urun/kolye-NBK024', OAI), dokunulmadi('OAI-SearchBot'))
esit('asistan → llms.txt: dokunulmadan geçer, sayılır', await dene('/llms.txt', OAI), dokunulmadi('OAI-SearchBot'))
esit('asistan → koleksiyon: dokunulmadan geçer, sayılır', await dene('/koleksiyon/charm-bileklikler', OAI), dokunulmadi('OAI-SearchBot'))
// En kritik satır: tarayıcı ana sayfayı okurken Instagram seçkisine çevrilmemeli.
esit('asistan → ana sayfa: Instagram seçkisine ÇEVRİLMEZ', await dene('/', OAI), dokunulmadi('OAI-SearchBot'))
esit('asistan → ana sayfa (başka kaynak etiketi): çevrilmez', await dene('/?utm_source=google', OAI), dokunulmadi('OAI-SearchBot'))
// Eşleştirici eğitim tarayıcısını ve arama motorunu vitrinde katmana getirmez.
// Yine de gelirse (eşleştirici ile liste bir gün ayrışırsa) işlev saymaz, iz
// başlığı da koymaz: sayım kararı tek yerde, lib/izleme/tarayicilar → sayilirMi.
esit('Googlebot → koleksiyon (katman çağrılsa bile): sayılmaz, iz başlığı yok', await dene('/koleksiyon/charm-bileklikler', GOOGLEBOT), sayilmadi)
esit('GPTBot → ürün sayfası (katman çağrılsa bile): sayılmaz, iz başlığı yok', await dene('/urun/kolye-NBK024', GPTBOT), sayilmadi)
esit('Googlebot → ana sayfa (katman çağrılsa bile): sayılmaz, çevrilmez', await dene('/?utm_source=google', GOOGLEBOT), sayilmadi)

const paylasimVar = yayindakiPaylasimlar().length > 0
const instagram = await dene('/?utm_source=Instagram&utm_medium=social', IPHONE)
esit(
  `Instagram'dan gelen ziyaretçi → ${paylasimVar ? 'seçkiye çevrilir' : 'yayında paylaşım yok, ana sayfa'}`,
  { tur: instagram.tur, hedef: instagram.hedef, yazim: instagram.yazim, isaret: instagram.isaret },
  paylasimVar
    ? { tur: 'cevirme', hedef: '/instagram?utm_source=Instagram&utm_medium=social', yazim: 0, isaret: null }
    : { tur: 'gecir', hedef: null, yazim: 0, isaret: null }
)

esit('/admin → /panel (308)', (await dene('/admin', CHROME)).tur + ' ' + (await dene('/admin/x', CHROME)).hedef, 'yonlendirme:308 /panel')
const panel = await dene('/panel/siparisler', CHROME)
esit('panel, oturumsuz → giriş sayfasına', { tur: panel.tur, hedef: panel.hedef, yazim: panel.yazim }, { tur: 'yonlendirme:307', hedef: '/panel/login', yazim: 0 })
const giris = await dene('/panel/login', CHROME)
esit('panel girişi: nonce politikası + önbellek yok', { tur: giris.tur, csp: giris.csp, onbellek: giris.onbellek }, { tur: 'gecir', csp: true, onbellek: 'no-store, max-age=0, must-revalidate' })
const odeme = await dene('/odeme', IPHONE)
esit('ödeme: nonce politikası + önbellek yok, sayım yok', { tur: odeme.tur, csp: odeme.csp, onbellek: odeme.onbellek, yazim: odeme.yazim, isaret: odeme.isaret }, { tur: 'gecir', csp: true, onbellek: 'no-store, max-age=0, must-revalidate', yazim: 0, isaret: null })
const girisSayfasi = await dene('/giris', CHROME)
esit('üye girişi: nonce politikası, önbellek başlığına dokunulmaz', { tur: girisSayfasi.tur, csp: girisSayfasi.csp, onbellek: girisSayfasi.onbellek }, { tur: 'gecir', csp: true, onbellek: null })
// Kapılı yolda katman herkes için çalışır: kapı her tarayıcıya işler, sayım yalnız asistana.
const botPanel = await dene('/panel', GOOGLEBOT)
esit('Googlebot → panel: sayılmaz, giriş sayfasına yönlenir', { tur: botPanel.tur, hedef: botPanel.hedef, yazim: botPanel.yazim }, { tur: 'yonlendirme:307', hedef: '/panel/login', yazim: 0 })
const asistanPanel = await dene('/panel', OAI)
esit('asistan → panel: sayılır ve giriş sayfasına yönlenir', { tur: asistanPanel.tur, hedef: asistanPanel.hedef, yazim: asistanPanel.yazim }, { tur: 'yonlendirme:307', hedef: '/panel/login', yazim: 1 })

console.log(`\n  ${gecen} geçti, ${kalan} kaldı`)
process.exit(kalan ? 1 : 0)
