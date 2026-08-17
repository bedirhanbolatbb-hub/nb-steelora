import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Auth bağlantılarının tek giriş kapısı.
 *
 * İki biçimi de kabul eder (Faz 11):
 *   - ?code=…                     → PKCE akışı (bağlantı, isteği başlatan tarayıcıda açılırsa)
 *   - ?token_hash=…&type=recovery → OTP akışı (farklı cihaz/tarayıcıda da çalışır)
 * Şifre sıfırlama maili artık buraya gelir; oturum burada kurulur ve
 * kullanıcı ?next ile yeni şifre ekranına aktarılır. Önceden mail doğrudan
 * /auth/sifremi-sifirla'ya gidiyor, oturum hiç kurulmadığı için updateUser
 * "Auth session missing" hatası veriyordu.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  // Açık yönlendirmeyi engelle: yalnız site içi yollar.
  const istenen = searchParams.get('next') ?? '/'
  const next = istenen.startsWith('/') && !istenen.startsWith('//') ? istenen : '/'

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('[auth/callback] verifyOtp hatası:', error.message)
    return NextResponse.redirect(`${origin}/auth/hata?sebep=${encodeURIComponent(error.message)}`)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    console.error('[auth/callback] exchangeCodeForSession hatası:', error.message)
    return NextResponse.redirect(`${origin}/auth/hata?sebep=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}/auth/hata`)
}
