import { NextRequest, NextResponse } from 'next/server'
import { cspUret } from '@/lib/security/basliklar'
import { panelCereziGecerliMi } from '@/lib/admin/panelOturumu'
import { yayindakiPaylasimlar } from '@/lib/instagram/paylasimlar'

/**
 * İstek katmanı — 14 Kas 2026'dan beri YALNIZ şu yollarda çalışır (matcher):
 *
 *  1. /admin → /panel yönlendirmesi ve /panel oturum kapısı.
 *  2. Nonce'lu sıkı güvenlik politikası gereken yollar: panel, hesabım, ödeme,
 *     sipariş sonucu, giriş, kayıt, şifre sıfırlama. Bu sayfalar dinamik kalır
 *     (layout'larında force-dynamic) ve her istekte yeni nonce alır.
 *  3. Instagram'dan gelen ana sayfa ziyareti (`/?utm_source=instagram`) →
 *     seçki sayfasına çevrilir.
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

const onekte = (yol: string, onek: string) => yol === onek || yol.startsWith(`${onek}/`)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/panel', request.url), 308)
  }

  // Yalnız `/?utm_source=instagram` buraya gelir (matcher). Yayında paylaşım
  // yoksa ana sayfa olduğu gibi (önbellekten) verilir.
  if (pathname === '/') {
    if (yayindakiPaylasimlar().length > 0) {
      return NextResponse.rewrite(new URL(`/instagram${request.nextUrl.search}`, request.url))
    }
    return NextResponse.next()
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
  ],
}
