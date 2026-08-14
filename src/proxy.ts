import { NextRequest, NextResponse } from 'next/server'

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
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/panel/:path*'],
}
