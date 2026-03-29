import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()

  if (password === process.env.ADMIN_SECRET_TOKEN) {
    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_token', process.env.ADMIN_SECRET_TOKEN!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
}
