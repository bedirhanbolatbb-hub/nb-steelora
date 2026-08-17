import { NextRequest, NextResponse } from 'next/server'

/** Ölçüm için istenen yolu sunucu bileşenlerine taşıyan başlık (Faz 12). */
const YOL_BASLIGI = 'x-nb-path'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const adminToken = request.cookies.get('admin_token')?.value
  const validToken = process.env.ADMIN_SECRET_TOKEN
  const authed = Boolean(validToken) && adminToken === validToken

  // Eski /admin emekli (Faz 7D): tüm alt yollar kalıcı olarak panele gider.
  // (/api/admin uçları bu matcher'a girmez; panelin kullandıkları yaşıyor.)
  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/panel', request.url), 308)
  }

  if (pathname.startsWith('/panel')) {
    if (pathname === '/panel/login') {
      if (authed) return NextResponse.redirect(new URL('/panel', request.url))
      return NextResponse.next()
    }
    if (!authed) {
      return NextResponse.redirect(new URL('/panel/login', request.url))
    }
    return NextResponse.next()
  }

  // Vitrin: yolu başlığa yaz ki layout page_view'i doğru yolla kaydedebilsin.
  // (headers() içinde istenen yol Next 16'da doğrudan bulunmuyor.)
  const basliklar = new Headers(request.headers)
  basliklar.set(YOL_BASLIGI, pathname)
  return NextResponse.next({ request: { headers: basliklar } })
}

export const config = {
  // Vitrin sayfaları ölçüm için dahil; statik dosyalar, görsel optimizasyonu,
  // API uçları ve panel/admin dışı her şey elenir.
  matcher: [
    '/admin/:path*',
    '/panel/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|icon|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|svg|ico|txt|xml|json|pdf)$).*)',
  ],
}
