import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// newsletter_subscribers RLS açık ve politikası yok: yazma yalnız service role ile
// yapılabilir, bu yüzden kayıt bu sunucu rotasından geçer.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: Request) {
  let email = ''
  let source = 'homepage'

  try {
    const body = await request.json()
    email = String(body?.email ?? '').trim().toLowerCase()
    if (typeof body?.source === 'string' && body.source.length <= 40) source = body.source
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  if (!email || email.length > 200 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, is_active')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      // Daha önce ayrılmışsa yeniden etkinleştir; zaten aboneyse dokunma.
      if (existing.is_active === false) {
        await supabase
          .from('newsletter_subscribers')
          .update({ is_active: true })
          .eq('id', existing.id)
      }
      return NextResponse.json({ success: true, alreadySubscribed: true })
    }

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email, source })

    if (error) {
      console.error('Newsletter insert error:', error.message)
      return NextResponse.json({ error: 'Kayıt oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Newsletter error:', error?.message)
    return NextResponse.json({ error: 'Kayıt oluşturulamadı' }, { status: 500 })
  }
}
