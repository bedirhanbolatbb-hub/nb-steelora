import { NextRequest, NextResponse } from 'next/server'
import { redirectDogrula } from '@/lib/iyzico/redirectImza'

/**
 * 3D Secure ara sayfası.
 *
 * iyzico'nun döndüğü HTML (bankanın 3DS formu) burada basılır; sayfa kendini
 * bankaya gönderir. İçerik İMZALI olmak zorunda — imzasız istek hiçbir şey
 * basmaz (bkz. lib/iyzico/redirectImza.ts, Faz 27).
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const htmlContent = formData.get('htmlContent') as string | null
  const imza = formData.get('imza') as string | null

  if (!htmlContent) {
    return new NextResponse('Missing htmlContent', { status: 400 })
  }

  const sonuc = redirectDogrula(htmlContent, imza)
  if (!sonuc.gecerli) {
    // Sebep istemciye YAZILMAZ: saldırgana hangi kontrole takıldığını
    // söylemenin bir faydası yok. Sunucu günlüğüne düşer.
    console.warn('[3ds] imzasız ya da geçersiz yönlendirme reddedildi:', sonuc.sebep)
    return new NextResponse('Gecersiz istek', { status: 400 })
  }

  const html = Buffer.from(htmlContent, 'base64').toString('utf-8')

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Bu sayfa hiçbir zaman çerçeve içine alınmamalı ve saklanmamalı.
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
