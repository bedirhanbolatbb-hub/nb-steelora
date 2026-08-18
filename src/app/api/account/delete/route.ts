import { NextResponse } from 'next/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { hesabiSilVeAnonimlestir, silmeEngeli } from '@/lib/account/hesapSilme'
import { sendMail } from '@/lib/emails/send'
import { accountDeletedEmail } from '@/lib/emails/templates'

export const dynamic = 'force-dynamic'

/** Katman B ziyaretçi çerezi — analitik izlerin bağını koparmak için okunur. */
const VISITOR_COOKIE = 'nb_vid'

/**
 * Müşterinin kendi hesabını silmesi (KVKK m.7 / m.11) — Faz 14.
 *
 * Yalnız oturum sahibi kendi hesabı için çağırabilir; hedef kullanıcı istekten
 * değil oturumdan okunur. Şifre yeniden istenir: oturumu açık kalmış bir
 * cihaza erişen başkasının hesabı silmesini engeller.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const sifre = String(body?.sifre ?? '')
  const onay = String(body?.onay ?? '').trim().toLocaleUpperCase('tr-TR')

  if (onay !== 'SİL') {
    return NextResponse.json({ error: 'Onay metni doğrulanamadı' }, { status: 400 })
  }
  if (!sifre) {
    return NextResponse.json({ error: 'Şifrenizi girin' }, { status: 400 })
  }

  // Şifre doğrulaması: çerez yazmayan ayrı bir istemciyle yapılır ki mevcut
  // oturum etkilenmesin.
  const dogrulayici = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
  const { error: sifreHatasi } = await dogrulayici.auth.signInWithPassword({
    email: user.email!,
    password: sifre,
  })
  if (sifreHatasi) {
    return NextResponse.json({ error: 'Şifre hatalı' }, { status: 403 })
  }

  // Teslim edilmemiş sipariş / açık iade talebi varsa silme yapılmaz: kargo
  // takibi ve iade hakkı sipariş kişiyle ilişkili kaldığı sürece kullanılabilir.
  const engel = await silmeEngeli(user.id)
  if (engel) return NextResponse.json({ error: engel, engel: true }, { status: 409 })

  const cookieStore = await cookies()
  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? null
  const eposta = user.email ?? null

  let sonuc
  try {
    sonuc = await hesabiSilVeAnonimlestir({
      userId: user.id,
      eposta,
      visitorId,
      kaynak: 'musteri',
    })
  } catch (hata: any) {
    console.error('[account/delete] silme yarıda kaldı:', hata?.message)
    return NextResponse.json(
      {
        error:
          'Silme işlemi tamamlanamadı. Hesabınıza hâlâ erişebilirsiniz; lütfen tekrar deneyin ' +
          'ya da info@nbsteelora.com adresine yazın.',
      },
      { status: 500 }
    )
  }

  // Bilgilendirme maili: hesap silindiği için bu son temas. Gönderim kimliği
  // yanıta da konur — mail akışının gerçekten çalıştığı, log okumadan
  // doğrulanabilsin (gönderilemezse silme yine de geçerlidir).
  let mailId: string | null = null
  let mailHata: string | null = null
  if (eposta) {
    const mail = accountDeletedEmail({ anonimSiparis: sonuc.anonimlestirilenSiparis })
    const gonderim = await sendMail({
      to: eposta,
      subject: mail.subject,
      html: mail.html,
      label: 'account-deleted',
    })
    mailId = gonderim.id
    mailHata = gonderim.error
  }

  // Oturumu kapat: auth kaydı silindiği için jetonlar zaten geçersiz, çerezler
  // de temizlenmeli. Rıza/ziyaretçi çerezleri de kaldırılır.
  await supabase.auth.signOut().catch(() => {})
  cookieStore.delete(VISITOR_COOKIE)

  return NextResponse.json({ ok: true, ozet: sonuc, mail: { id: mailId, hata: mailHata } })
}
