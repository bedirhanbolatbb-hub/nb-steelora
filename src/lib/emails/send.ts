import { MAIL_FROM } from './templates'

/**
 * HTML gövdeden düz metin alternatifi üretir (Faz 11C — teslim edilebilirlik).
 *
 * GERÇEK OLAY: ilk müşteri "kargo maili ulaşmadı" diye yazdı. Damgalar
 * gönderimi kanıtlıyor; ulaşmama tarafındaki düzeltilebilir etkenlerden biri
 * her mailin SALT HTML gitmesiydi — text/plain alternatifi olmayan HTML,
 * spam filtrelerinin bilinen tetikleyicilerindendir. Artık her gönderime
 * otomatik düz metin ekleniyor; şablonlar değişmeden.
 */
export function duzMetin(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_e, u, m) => {
      const metin = String(m).replace(/<[^>]+>/g, '').trim()
      return metin && !u.startsWith('mailto:') ? `${metin}: ${u}` : metin
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Tek gönderim noktası. Resend hatayı fırlatmaz, yanıtta döndürür; burada
 * loglanır ve çağırana { id, error } olarak verilir.
 */
export async function sendMail(params: {
  to: string
  subject: string
  html: string
  label: string
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const result = await resend.emails.send({
      from: MAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      // Düz metin alternatifi: salt-HTML mail spam sinyalidir (Faz 11C).
      text: duzMetin(params.html),
      // Yanıtlar sitede yayınlanan iletişim adresine düşsün; siparis@ yalnız
      // gönderim kimliği. (BB: Cloudflare Email Routing'de info@ kuralının
      // açık olduğunu doğrula.)
      replyTo: 'info@nbsteelora.com',
    })

    if (result.error) {
      console.error(`${params.label} email rejected:`, result.error)
      return { id: null, error: result.error.message ?? 'unknown' }
    }

    console.log(`${params.label} email sent:`, result.data?.id)
    return { id: result.data?.id ?? null, error: null }
  } catch (error: any) {
    console.error(`${params.label} email error:`, error?.message)
    return { id: null, error: error?.message ?? 'unknown' }
  }
}
