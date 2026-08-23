import { NextResponse } from 'next/server'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { epostaAlani, htmlKacir, metinAlani } from '@/lib/guvenlik/girdi'
import { sendMail } from '@/lib/emails/send'
import { bildirimAdresi } from '@/lib/emails/bildirim'

/**
 * İletişim formu (Faz 27'de onarıldı).
 *
 * KUSUR: Form `contact_messages` tablosuna yazmaya çalışıyordu ama BÖYLE BİR
 * TABLO YOK (canlıda doğrulandı: PGRST205). `insert` sonucu hiç okunmadığı
 * için hata sessizce yutuluyor, uç her koşulda `{ success: true }` dönüyordu.
 * Yani müşteri "mesajınız alındı" görüyor ve mesajı kayboluyordu — üstelik
 * iletişim formu KVKK m.11 başvuru kanallarından biri, o hak kullanımı
 * sessizce kırıktı.
 *
 * Tablo açmak yerine mesaj DOĞRUDAN e-postayla iletiliyor: zaten çalışan bir
 * kanal (Resend) var ve mesajın okunması için ikinci bir ekran gerekmiyor.
 * Gönderim başarısızsa müşteriye DOĞRUSU söylenir.
 */

const AZAMI_AD = 100
const AZAMI_KONU = 150
const AZAMI_MESAJ = 4000

export async function POST(request: Request) {
  // Faz 27: kalıcı hız sınırı (bkz. lib/guvenlik/hizSiniri.ts).
  const _sinir = await hizSiniri(`iletisim:${istekKimligi(request)}`, 5, 3600)
  if (!_sinir.gecer) return cokFazlaIstek(_sinir.bekleSaniye)

  const govde = await request.json().catch(() => null)

  // Faz 27: uzunluk ve tip denetimi eklendi. Önceden `name`, `subject` ve
  // `message` sınırsızdı; megabaytlık bir gövde doğrudan geçiyordu.
  const ad = metinAlani(govde?.name, AZAMI_AD)
  const eposta = epostaAlani(govde?.email)
  const konu = metinAlani(govde?.subject, AZAMI_KONU)
  const mesaj = metinAlani(govde?.message, AZAMI_MESAJ)

  if (!ad || !eposta || !mesaj) {
    return NextResponse.json(
      { error: 'Ad, e-posta ve mesaj alanları zorunludur.' },
      { status: 400 }
    )
  }

  try {
    const alici = await bildirimAdresi()
    // Müşteri metni KAÇIRILIR: yöneticinin gelen kutusunda ham HTML olarak
    // çalışmasın.
    const govdeHtml = `
      <p><strong>Ad:</strong> ${htmlKacir(ad)}</p>
      <p><strong>E-posta:</strong> ${htmlKacir(eposta)}</p>
      ${konu ? `<p><strong>Konu:</strong> ${htmlKacir(konu)}</p>` : ''}
      <hr>
      <p style="white-space:pre-wrap">${htmlKacir(mesaj)}</p>
    `.trim()

    const sonuc = await sendMail({
      to: alici,
      subject: `İletişim formu: ${konu || ad}`,
      html: govdeHtml,
      label: '[iletişim]',
    })

    if (sonuc.error) throw new Error(sonuc.error)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    // Ham hata metni İSTEMCİYE DÖNMEZ: Postgres/Resend hataları tablo, sütun
    // ve yapılandırma adlarını açık eder. Ayrıntı yalnız sunucu günlüğüne.
    console.error('[iletişim] mesaj iletilemedi:', e?.message)
    return NextResponse.json(
      { error: 'Mesajınız şu an iletilemedi. Lütfen biraz sonra tekrar deneyin.' },
      { status: 502 }
    )
  }
}
