import { NextRequest, NextResponse, type NextFetchEvent } from 'next/server'
import { cspUret } from '@/lib/security/basliklar'
import { panelCereziGecerliMi } from '@/lib/admin/panelOturumu'
import { yayindakiPaylasimlar } from '@/lib/instagram/paylasimlar'
import { sayilirMi, tarayiciBul } from '@/lib/izleme/tarayicilar'
import { tarayiciZiyaretiYaz } from '@/lib/izleme/tarayiciSayaci'

/**
 * İstek katmanı — 14 Kas 2026'dan beri YALNIZ şu yollarda çalışır (matcher):
 *
 *  1. /admin → /panel yönlendirmesi ve /panel oturum kapısı.
 *  2. Nonce'lu sıkı güvenlik politikası gereken yollar: panel, hesabım, ödeme,
 *     sipariş sonucu, giriş, kayıt, şifre sıfırlama. Bu sayfalar dinamik kalır
 *     (layout'larında force-dynamic) ve her istekte yeni nonce alır.
 *  3. Instagram'dan gelen ana sayfa ziyareti (`/?utm_source=instagram`) →
 *     seçki sayfasına çevrilir.
 *  4. Tarayıcı sayacı (24 Kas 2026): kullanıcı aracısı bir yapay zekâ
 *     ASİSTANININ adını taşıyan sayfa istekleri. Katman bu isteklerde yalnız
 *     sayar ve isteği DOKUNMADAN geçirir (nonce yok, başlık değişmez; sayfa
 *     yine önbellekten verilir). Koşul eşleştiricide: insan ziyaretçinin
 *     isteği bu katmana hiç gelmez. Ölçüm: yanıtta `x-nb-tarayici` başlığı
 *     yalnız bu isteklerde bulunur. 25 Kas 2026'dan beri eğitim ve arama
 *     tarayıcıları (GPTBot, Googlebot…) sayılmaz ve eşleştiriciden geçmez:
 *     katman çağrı başına ~0,18 sn sunucu süresi harcıyor, günde ~600
 *     tarayıcı isteğinin onda dokuzu onlardı (lib/izleme/tarayicilar.ts).
 *
 * Neden: vitrin sayfaları artık önbellekten veriliyor (ücretsiz planda ayda
 * 4 saatlik sunucu süresi sınırı). Önbellekten dönen sayfa istek başı nonce
 * taşıyamaz; vitrinin sabit (nonce'suz) güvenlik politikası next.config.ts'te
 * ve bu katman vitrin isteklerinde hiç çalışmaz. BB onayı: 13–14 Kas 2026.
 *
 * Kaldırılanlar: x-nb-path / x-nb-kampanya başlıkları (sayfa görüntüleme artık
 * tarayıcıdan ölçülüyor: components/store/SayfaGoruntuleme) ve izleyici
 * kısa devresi (Sentry yoklaması next.config.ts'te statik dosyaya yönlenir).
 */

function nonceUret(): string {
  return btoa(crypto.randomUUID())
}

function guvenlikEkle(yanit: NextResponse, csp: string, gizliYol: boolean): NextResponse {
  yanit.headers.set('Content-Security-Policy', csp)
  if (gizliYol) {
    yanit.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
    yanit.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return yanit
}

const GIZLI_ONEKLER = ['/hesabim', '/odeme', '/siparis-tamamlandi']

/**
 * Oturum kapısı ya da nonce'lu politika gereken yollar — eşleştiricideki ilk
 * yedi satırla aynı. Tarayıcı sayacı eşleştiriciyi vitrin yollarına da açtığı
 * için "buraya gelen her istek kapılı yoldur" varsayımı artık geçerli değil;
 * bu listenin dışındaki yollar dokunulmadan geçirilir.
 */
const KAPILI_ONEKLER = ['/panel', '/hesabim', '/odeme', '/siparis-tamamlandi', '/giris', '/kayit', '/sifremi-unuttum']

const onekte = (yol: string, onek: string) => yol === onek || yol.startsWith(`${onek}/`)

/** İsteği olduğu gibi geçirir; tarayıcı isteğinde yanıta yalnız tanı başlığı ekler. */
function dokunmadanGecir(tarayiciAdi: string | null): NextResponse {
  const yanit = NextResponse.next()
  if (tarayiciAdi) yanit.headers.set('x-nb-tarayici', tarayiciAdi)
  return yanit
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl

  // Tarayıcı sayacı: yalnız SAYILAN gruptaki adlarla gelen isteklerde yazar;
  // yazım yanıtı bekletmez (lib/izleme/tarayiciSayaci.ts). Kapılı yollarda
  // katman herkes için çalışır (ör. Googlebot /giris'e gelirse): tanınan ama
  // sayılmayan tarayıcı burada elenir.
  const taninan = tarayiciBul(request.headers.get('user-agent'))
  const tarayici = sayilirMi(taninan) ? taninan : null
  if (tarayici && (request.method === 'GET' || request.method === 'HEAD')) {
    event.waitUntil(tarayiciZiyaretiYaz(tarayici, pathname))
  }

  if (onekte(pathname, '/admin')) {
    return NextResponse.redirect(new URL('/panel', request.url), 308)
  }

  // Instagram'dan gelen ana sayfa ziyareti seçki sayfasına çevrilir. Koşul
  // eskiden yalnız eşleştiricideydi; tarayıcı sayacı ana sayfayı da buraya
  // getirdiği için burada da denetlenir. Yayında paylaşım yoksa ana sayfa
  // olduğu gibi (önbellekten) verilir.
  if (pathname === '/') {
    const kaynak = (request.nextUrl.searchParams.get('utm_source') || '').toLowerCase()
    if (kaynak === 'instagram' && yayindakiPaylasimlar().length > 0) {
      return NextResponse.rewrite(new URL(`/instagram${request.nextUrl.search}`, request.url))
    }
    return dokunmadanGecir(tarayici?.ad ?? null)
  }

  if (!KAPILI_ONEKLER.some((o) => onekte(pathname, o))) {
    return dokunmadanGecir(tarayici?.ad ?? null)
  }

  const nonce = nonceUret()
  const csp = cspUret(nonce, process.env.NODE_ENV === 'development')

  if (pathname.startsWith('/panel')) {
    const authed = await panelCereziGecerliMi(
      request.cookies.get('admin_token')?.value,
      process.env.ADMIN_SECRET_TOKEN
    )
    if (pathname === '/panel/login') {
      if (authed) return NextResponse.redirect(new URL('/panel', request.url))
      return guvenlikEkle(NextResponse.next(), csp, true)
    }
    if (!authed) {
      return NextResponse.redirect(new URL('/panel/login', request.url))
    }
    return guvenlikEkle(NextResponse.next(), csp, true)
  }

  const basliklar = new Headers(request.headers)
  basliklar.set('x-nonce', nonce)
  basliklar.set('Content-Security-Policy', csp)
  const gizliYol = GIZLI_ONEKLER.some((o) => onekte(pathname, o))
  return guvenlikEkle(NextResponse.next({ request: { headers: basliklar } }), csp, gizliYol)
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/panel/:path*',
    '/hesabim/:path*',
    '/odeme/:path*',
    '/siparis-tamamlandi/:path*',
    '/giris/:path*',
    '/kayit/:path*',
    '/sifremi-unuttum/:path*',
    {
      source: '/',
      has: [{ type: 'query', key: 'utm_source', value: '[iI][nN][sS][tT][aA][gG][rR][aA][mM]' }],
    },
    // Tarayıcı sayacı: YALNIZ kullanıcı aracısı SAYILAN gruptaki (asistanlar)
    // adlardan birini taşıyan sayfa istekleri (betik, biçem, görsel ve /api
    // hariç). Kalıp lib/izleme/tarayicilar.ts → eslestiriciKalibi() ile birebir
    // aynı olmalı; Next burada sabit metin istediği için elle yazılı, eşitliği
    // test denetler (src/lib/izleme/__testler__/tarayicilar.test.mts).
    {
      source:
        '/((?!_next/|api/|.*\\.(?:js|css|map|png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|otf|mp4|webm|json|webmanifest)$).*)',
      has: [
        {
          type: 'header',
          key: 'user-agent',
          value:
            '.*(?:OAI-SearchBot|ChatGPT-User|Perplexity[Bb]ot|Perplexity-User|Claude-SearchBot|Claude-User|Claude-Web|GoogleAgent-URLContext|GoogleAgent-Mariner|Google-NotebookLM|Gemini-Deep-Research|Apple[Bb]ot|DuckAssistBot|MistralAI-User|MistralAI-Index|[Mm]eta-[Ee]xternal[Ff]etcher|Amzn-SearchBot|Amzn-User|YouBot|GrokBot|xAI-Grok|kagi-fetcher|TavilyBot|LinkupBot|Bravebot|ExaSearchBot|PhindBot|AzureAI-SearchBot|cohere-ai|Kimi-SearchBot|Kimi-User|TongyiBot|YiyanBot|DoubaoBot|Manus-User).*',
        },
      ],
    },
  ],
}
