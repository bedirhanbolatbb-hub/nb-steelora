import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Ad, e-posta ve mesaj alanları zorunludur.' },
        { status: 400 }
      )
    }

    // Resend entegrasyonu yoksa, Supabase'e kaydet
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    await supabase.from('contact_messages').insert({
      name,
      email,
      subject: subject || null,
      message,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
