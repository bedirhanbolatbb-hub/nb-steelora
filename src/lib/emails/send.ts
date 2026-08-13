import { MAIL_FROM } from './templates'

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
