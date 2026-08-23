import { NextResponse } from 'next/server'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { ilkSiparisDuyurusu } from '@/lib/campaigns/ilkSiparisKuponu'
import { createServiceClient } from '@/lib/supabase/service'

// newsletter_subscribers RLS açık ve politikası yok: yazma yalnız service role ile
// yapılabilir, bu yüzden kayıt bu sunucu rotasından geçer.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: Request) {
  // Faz 27: kalıcı hız sınırı (bkz. lib/guvenlik/hizSiniri.ts).
  const _sinir = await hizSiniri(`bulten:${istekKimligi(request)}`, 5, 3600)
  if (!_sinir.gecer) return cokFazlaIstek(_sinir.bekleSaniye)

  let email = ''
  let source = 'homepage'
  let consent = false

  try {
    const body = await request.json()
    email = String(body?.email ?? '').trim().toLowerCase()
    consent = body?.consent === true
    if (typeof body?.source === 'string' && body.source.length <= 40) source = body.source
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  // Ticari elektronik ileti onayı olmadan kayıt açılmaz.
  if (!consent) {
    return NextResponse.json(
      { error: 'Devam etmek için ticari elektronik ileti onayı gerekiyor' },
      { status: 400 }
    )
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
          .update({ is_active: true, consented_at: new Date().toISOString() })
          .eq('id', existing.id)
      }
      return NextResponse.json({
        success: true,
        alreadySubscribed: true,
        kuponMesaji: (await ilkSiparisDuyurusu())?.bulten ?? null,
      })
    }

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email, source, consented_at: new Date().toISOString() })

    if (error) {
      console.error('Newsletter insert error:', error.message)
      return NextResponse.json({ error: 'Kayıt oluşturulamadı' }, { status: 500 })
    }

    // Yeni abone: teşekkür mesajında ilk sipariş kuponu da verilir. Metin
    // SUNUCUDA üretilir — otomatik bir vitrin kampanyası varken null döner,
    // yani "sepette %30" sürerken kimseye daha kötü olan kod önerilmez.
    return NextResponse.json({
      success: true,
      kuponMesaji: (await ilkSiparisDuyurusu())?.bulten ?? null,
    })
  } catch (error: any) {
    console.error('Newsletter error:', error?.message)
    return NextResponse.json({ error: 'Kayıt oluşturulamadı' }, { status: 500 })
  }
}
