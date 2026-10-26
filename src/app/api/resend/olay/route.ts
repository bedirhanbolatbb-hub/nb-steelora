import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { cokFazlaIstek, hizSiniri, istekKimligi } from '@/lib/guvenlik/hizSiniri'
import { adminMailUlasmadiEmail } from '@/lib/emails/templates'
import { bildirimAdresi } from '@/lib/emails/bildirim'
import { sendMail } from '@/lib/emails/send'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Resend olay bildirimi — müşteri maili ulaşmadığında BB'yi uyarır (Faz 34).
 *
 * GERÇEK OLAY (26 Eki 2026): üçüncü gerçek siparişin onay maili müşterinin
 * adresinden kalıcı olarak geri döndü. Resend adresi 1 saniye içinde baskı
 * listesine aldı; sonraki her gönderim sessizce durduruldu ve kimse fark
 * etmedi — BB panelde ham "suppressed" yazısını görene kadar.
 *
 * ── Doğrulama: yüke güvenilmez ──
 * Bu uç herkese açık. İmza sırrı tutmak yerine gelen yükteki HİÇBİR bilgiye
 * güvenmiyoruz: yalnız mail kimliği alınır, mailin kendisi Resend'den KENDİ
 * anahtarımızla okunur ve son olayı gerçekten "bounced"/"complained" ise
 * işlem yapılır. Sahte bir istek en fazla, gerçekten geri dönmüş bir mail
 * için doğru bir uyarıyı tetikleyebilir.
 *
 * ── Tekillik ──
 * Aynı mail için ikinci uyarı gitmez: kalıcı sayaç (hız sınırı tablosu)
 * mail kimliğiyle bir kez geçer. Sipariş satırına yazılmaz — bu olay onay
 * mailinin damgasıyla aynı saniyede gelebiliyor ve aynı alana iki yazım
 * birbirini silerdi.
 *
 * Resend'e her durumda 200 döner: ilgisiz ya da doğrulanamayan olay için
 * yeniden deneme istemiyoruz.
 */

const ILGILI: Record<string, 'bounced' | 'complained'> = {
  'email.bounced': 'bounced',
  'email.complained': 'complained',
}

const tamam = (islem: string) => NextResponse.json({ ok: true, islem })

export async function POST(request: Request) {
  const sinir = await hizSiniri(`resend-olay:${istekKimligi(request)}`, 120, 3600)
  if (!sinir.gecer) return cokFazlaIstek(sinir.bekleSaniye)

  const govde = await request.json().catch(() => null)
  const beklenen = ILGILI[String(govde?.type ?? '')]
  const mailId = String(govde?.data?.email_id ?? '').trim()
  if (!beklenen || !/^[0-9a-f-]{36}$/i.test(mailId)) return tamam('ilgisiz')

  // Doğrulama: mail Resend'den kendi anahtarımızla okunur.
  let mail: { subject?: string; to?: string[]; last_event?: string } | null = null
  try {
    const r = await fetch(`https://api.resend.com/emails/${mailId}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ''}` },
      cache: 'no-store',
    })
    if (r.ok) mail = await r.json()
  } catch {
    /* doğrulanamazsa işlem yapılmaz */
  }
  if (!mail || String(mail.last_event ?? '') !== beklenen) return tamam('dogrulanamadi')

  const konu = String(mail.subject ?? '')
  const alici = String(mail.to?.[0] ?? '').trim().toLowerCase()
  const siparisNo = konu.match(/NBS-[0-9A-Z-]+/i)?.[0]
  if (!alici || !siparisNo) return tamam('siparis-disi')

  const service = createServiceClient()
  const { data: order } = await service
    .from('orders')
    .select('*')
    .eq('order_number', siparisNo)
    .maybeSingle()
  // Adres sonradan düzeltildiyse eski adresin geç gelen olayı yok sayılır.
  if (!order || String(order.guest_email ?? '').trim().toLowerCase() !== alici) {
    return tamam('siparis-eslesmedi')
  }

  const tekil = await hizSiniri(`resend-olay-tekil:${mailId}`, 1, 30 * 86400)
  if (!tekil.gecer) return tamam('zaten-bildirildi')

  try {
    const uyari = adminMailUlasmadiEmail(order, konu, beklenen)
    await sendMail({ to: await bildirimAdresi(), ...uyari, label: `Admin mail ulaşmadı (${beklenen})` })
  } catch (e) {
    console.error('[resend-olay] uyarı gönderilemedi:', e instanceof Error ? e.message : e)
  }
  console.log(`[resend-olay] ${beklenen} · sipariş=${siparisNo}`)
  return tamam('bildirildi')
}
