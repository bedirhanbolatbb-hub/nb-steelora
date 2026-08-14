import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /panel aynı admin çerezini kullanır (Faz 7A) — yeni bir auth yazılmadı.
  if (pathname.startsWith('/admin') || pathname.startsWith('/panel')) {
    const adminToken = request.cookies.get('admin_token')?.value
    const validToken = process.env.ADMIN_SECRET_TOKEN

    if (pathname === '/admin/login') {
      if (adminToken === validToken) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return NextResponse.next()
    }

    if (adminToken !== validToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/panel/:path*'],
}
