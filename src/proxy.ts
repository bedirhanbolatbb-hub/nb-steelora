import { NextRequest, NextResponse } from 'next/server'
import { cspUret } from '@/lib/security/basliklar'
import { panelCereziGecerliMi } from '@/lib/admin/panelOturumu'

/** Ölçüm için istenen yolu sunucu bileşenlerine taşıyan başlık (Faz 12). */
const YOL_BASLIGI = 'x-nb-path'

/**
 * Kampanya etiketlerini taşıyan başlık (Faz 32).
 *
 * Ölçüm yolu sorgu dizesini ATAR (temizYol) — doğru karar, çünkü sorguda
 * kişisel veri gezebilir. Ama bu yüzden Instagram profilindeki bağlantı ile
 * hikâyedeki bağlantı ayırt edilemiyordu; ikisi de "Sosyal medya" yazıyordu.
 * Yalnız utm_* etiketleri, kısaltılmış hâlde taşınır; başka hiçbir parametre
 * alınmaz.
 */
const KAMPANYA_BASLIGI = 'x-nb-kampanya'

/** Sorgu dizesinden YALNIZ utm_source/medium/campaign — en fazla 60 karakter. */
function kampanyaEtiketi(arama: URLSearchParams): string {
  const al = (ad: string) => (arama.get(ad) || '').trim().slice(0, 60)
  const parcalar = [al('utm_source'), al('utm_medium'), al('utm_campaign')]
  return parcalar.some(Boolean) ? parcalar.join('|') : ''
}

/**
 * Her istek için tek kullanımlık nonce.
 *
 * `crypto.randomUUID()` Edge çalışma zamanında var; base64'e çevrilmesi CSP
 * söz diziminde güvenli bir karakter kümesi bırakır.
 */
function nonceUret(): string {
  return btoa(crypto.randomUUID())
}

/**
 * Yanıta CSP'yi ve gizli yol başlıklarını ekler.
 *
 * CSP burada üretilir çünkü nonce isteğe özeldir; sabit başlıklar
 * `next.config.ts` içinde tanımlı ve API dahil her yola uygulanır.
 */
function guvenlikEkle(yanit: NextResponse, csp: string, gizliYol: boolean): NextResponse {
  yanit.headers.set('Content-Security-Policy', csp)
  if (gizliYol) {
    // Panel ve hesap sayfaları kişisel veri taşır: ara belleğe alınmasın,
    // arama motorlarına düşmesin.
    yanit.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
    yanit.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return yanit
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Faz 27: çerez artık sırrın kendisini değil, ondan türetilmiş özeti
  // taşıyor. Doğrulama route handler'larla AYNI yardımcıdan geçiyor.
  const authed = await panelCereziGecerliMi(
    request.cookies.get('admin_token')?.value,
    process.env.ADMIN_SECRET_TOKEN
  )

  const nonce = nonceUret()
  const csp = cspUret(nonce, process.env.NODE_ENV === 'development')
  const gizliYol =
    pathname.startsWith('/panel') ||
    pathname.startsWith('/hesabim') ||
    pathname.startsWith('/odeme') ||
    pathname.startsWith('/siparis-tamamlandi')

  // Eski /admin emekli (Faz 7D): tüm alt yollar kalıcı olarak panele gider.
  // (/api/admin uçları bu matcher'a girmez; panelin kullandıkları yaşıyor.)
  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/panel', request.url), 308)
  }

  if (pathname.startsWith('/panel')) {
    if (pathname === '/panel/login') {
      if (authed) return NextResponse.redirect(new URL('/panel', request.url))
      return guvenlikEkle(NextResponse.next(), csp, true)
    }
    if (!authed) {
      return NextResponse.redirect(new URL('/panel/login', request.url))
    }
    return guvenlikEkle(NextResponse.next(), csp, true)
  }

  // Vitrin: yolu başlığa yaz ki layout page_view'i doğru yolla kaydedebilsin.
  // (headers() içinde istenen yol Next 16'da doğrudan bulunmuyor.)
  const basliklar = new Headers(request.headers)
  basliklar.set(YOL_BASLIGI, pathname)
  const kampanya = kampanyaEtiketi(request.nextUrl.searchParams)
  if (kampanya) basliklar.set(KAMPANYA_BASLIGI, kampanya)
  // Sunucu bileşenleri (JsonLd) nonce'u buradan okur.
  basliklar.set('x-nonce', nonce)
  // Next kendi inline script'lerine nonce'u İSTEK başlığındaki CSP'den okur.
  basliklar.set('Content-Security-Policy', csp)

  return guvenlikEkle(NextResponse.next({ request: { headers: basliklar } }), csp, gizliYol)
}

export const config = {
  // Vitrin sayfaları ölçüm için dahil; statik dosyalar, görsel optimizasyonu,
  // API uçları ve panel/admin dışı her şey elenir.
  //
  // /api DIŞARIDA olduğu için CSP oraya uygulanmaz — 3DS ara sayfasının
  // bankaya form göndermesi bu sayede kırılmaz (bkz. lib/security/basliklar.ts).
  matcher: [
    '/admin/:path*',
    '/panel/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|icon|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|svg|ico|txt|xml|json|pdf)$).*)',
  ],
}
