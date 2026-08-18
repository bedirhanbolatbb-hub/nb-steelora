import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * E-posta bağlantılarının (kayıt doğrulama, şifre sıfırlama) ortak işleyicisi.
 * Hem /auth/confirm hem /auth/callback bunu çağırır.
 *
 * İki biçim de kabul edilir:
 *   - ?token_hash=…&type=signup  → verifyOtp; **cihazdan bağımsız** çalışır.
 *     Şablonlar bu biçimi üretmeli ({{ .TokenHash }}).
 *   - ?code=…                    → PKCE; yalnız akışı BAŞLATAN tarayıcıda çalışır,
 *     çünkü code_verifier o tarayıcının çerezinde durur. Supabase şablonu
 *     {{ .ConfirmationURL }} kullandığında bağlantı bu biçimde gelir; mail
 *     başka cihazda açılırsa "PKCE code verifier not found in storage" hatası
 *     alınır. Geriye dönük uyumluluk için destekleniyor.
 *
 * PKCE hatası kullanıcıya ham hata olarak gösterilmez: Supabase'in /auth/v1/verify
 * ucu bağlantıyı tüketirken e-postayı zaten doğrulamış olur, kırılan yalnız oturum
 * kurma adımıdır. Bu yüzden kayıt akışında "doğrulandı, giriş yapabilirsin",
 * şifre sıfırlamada "bağlantıyı aynı cihazda aç / yeni bağlantı iste" denir.
 */
export async function epostaBaglantisiniIsle(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  // Açık yönlendirmeyi engelle: yalnız site içi yollar.
  const istenen = searchParams.get('next') ?? '/'
  const next = istenen.startsWith('/') && !istenen.startsWith('//') ? istenen : '/'
  // Şifre sıfırlama akışı mı? (hata mesajını doğru seçmek için)
  const sifreAkisi = type === 'recovery' || next.startsWith('/auth/sifremi-sifirla')

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
    console.error('[auth] verifyOtp hatası:', error.message)
    const durum = sifreAkisi ? 'sifre-baglanti-gecersiz' : 'kayit-baglanti-gecersiz'
    return NextResponse.redirect(`${origin}/auth/hata?durum=${durum}`)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)

    const pkceEksik = /code verifier/i.test(error.message)
    console.error('[auth] exchangeCodeForSession hatası:', error.message)
    if (pkceEksik) {
      // Bağlantı başka cihazda/tarayıcıda açıldı. E-posta doğrulaması Supabase
      // tarafında tamamlandı; burada yalnız oturum kurulamadı.
      const durum = sifreAkisi ? 'sifre-farkli-cihaz' : 'kayit-farkli-cihaz'
      return NextResponse.redirect(`${origin}/auth/hata?durum=${durum}`)
    }
    const durum = sifreAkisi ? 'sifre-baglanti-gecersiz' : 'kayit-baglanti-gecersiz'
    return NextResponse.redirect(`${origin}/auth/hata?durum=${durum}`)
  }

  return NextResponse.redirect(`${origin}/auth/hata`)
}
