/**
 * Resend teslim durumu sorgusu (Faz 11C).
 *
 * GERÇEK OLAY: müşteri "kargo maili ulaşmadı" dedi; elimizde yalnız gönderim
 * damgası vardı, teslim edilip edilmediğini bilmiyorduk. Resend her mailin
 * son olayını (delivered / bounced / complained…) GET /emails/{id} ile verir —
 * ama mevcut anahtar yalnız-gönderim yetkili (ölçüldü: 401 restricted_api_key).
 *
 * Bu modül iki durumda da dürüst konuşur: anahtar okuyabiliyorsa gerçek son
 * olayı döner; kısıtlıysa panelde "anahtar yalnız gönderim yetkili" uyarısı
 * gösterilir ve BB'ye tam yönerge yazılır (rapor + panel metni).
 */

export type MailTeslimDurumu =
  | { durum: 'ok'; sonOlay: string; tarih: string | null }
  | { durum: 'kisitli' }
  | { durum: 'bulunamadi' }
  | { durum: 'hata'; detay: string }

const OLAY_TR: Record<string, string> = {
  sent: 'Gönderildi',
  delivered: 'Teslim edildi',
  delivery_delayed: 'Teslim gecikti',
  bounced: 'Geri döndü (bounce)',
  complained: 'Spam şikâyeti',
  opened: 'Açıldı',
  clicked: 'Tıklandı',
  queued: 'Kuyrukta',
  scheduled: 'Zamanlanmış',
  canceled: 'İptal edildi',
  failed: 'Başarısız',
}

export function olayTurkce(olay: string): string {
  return OLAY_TR[olay] ?? olay
}

export async function mailTeslimDurumu(resendId: string): Promise<MailTeslimDurumu> {
  try {
    const r = await fetch(`https://api.resend.com/emails/${resendId}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      cache: 'no-store',
    })
    if (r.status === 401) return { durum: 'kisitli' }
    if (r.status === 404) return { durum: 'bulunamadi' }
    if (!r.ok) return { durum: 'hata', detay: `HTTP ${r.status}` }
    const j = await r.json()
    return {
      durum: 'ok',
      sonOlay: String(j.last_event ?? 'sent'),
      tarih: j.created_at ?? null,
    }
  } catch (e: unknown) {
    return { durum: 'hata', detay: e instanceof Error ? e.message : 'bilinmiyor' }
  }
}
