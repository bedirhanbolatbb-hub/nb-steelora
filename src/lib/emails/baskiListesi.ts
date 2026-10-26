/**
 * Resend baskı listesi (suppression list) — Faz 34.
 *
 * GERÇEK OLAY (26 Eki 2026): üçüncü gerçek sipariş geldi, sipariş onayı maili
 * Resend'e ulaştı ama Resend "suppressed" dedi: alıcı adres hesabın baskı
 * listesindeydi. Resend bir adresi, o adrese giden bir mail kalıcı olarak geri
 * dönünce (adres yok / yazım hatası) ya da alıcı spam şikâyeti yapınca listeye
 * kendiliğinden alır; listedeki adrese sonraki HİÇBİR mail teslim edilmez —
 * gönderim tarafı "başarılı" görünse bile.
 *
 * Panel o güne kadar yalnız "suppressed" kelimesini ham gösteriyordu; sebebi
 * ve çıkış yolu yoktu. Bu modül sebebi okur ve engeli kaldırır. Kaldırmak
 * kökteki sorunu çözmez: adres yanlışsa bir sonraki mail yine geri döner ve
 * adres listeye geri girer — panel bunu açıkça söyler.
 */

export type BaskiKaydi = {
  id: string
  email: string
  /** bounce = kalıcı geri dönüş, complaint = spam şikâyeti, manual = elle eklenmiş. */
  sebep: 'bounce' | 'complaint' | 'manual'
  /** Listeye alınmaya yol açan mailin kimliği (varsa). */
  kaynakMailId: string | null
  eklenme: string
  /** Kaynak mailin konusu ve son olayı — BB hangi mailin döndüğünü görsün. */
  kaynakMail: { konu: string; sonOlay: string; tarih: string } | null
}

export type BaskiSonucu =
  | { durum: 'yok' }
  | { durum: 'var'; kayit: BaskiKaydi }
  | { durum: 'kisitli' }
  | { durum: 'hata'; detay: string }

const TEMEL = 'https://api.resend.com'

function baslik() {
  return { Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ''}` }
}

/** Adres baskı listesinde mi, neden? */
export async function baskiKaydiBul(eposta: string): Promise<BaskiSonucu> {
  const adres = eposta.trim().toLowerCase()
  if (!adres) return { durum: 'yok' }
  try {
    const r = await fetch(`${TEMEL}/suppressions/${encodeURIComponent(adres)}`, {
      headers: baslik(),
      cache: 'no-store',
    })
    if (r.status === 401 || r.status === 403) return { durum: 'kisitli' }
    if (r.status === 404) return { durum: 'yok' }
    if (!r.ok) return { durum: 'hata', detay: `HTTP ${r.status}` }
    const j = (await r.json()) as {
      id: string
      email: string
      origin: 'bounce' | 'complaint' | 'manual'
      source_id: string | null
      created_at: string
    }

    let kaynakMail: BaskiKaydi['kaynakMail'] = null
    if (j.source_id) {
      try {
        const k = await fetch(`${TEMEL}/emails/${j.source_id}`, { headers: baslik(), cache: 'no-store' })
        if (k.ok) {
          const m = (await k.json()) as { subject?: string; last_event?: string; created_at?: string }
          kaynakMail = {
            konu: m.subject ?? '',
            sonOlay: String(m.last_event ?? ''),
            tarih: m.created_at ?? '',
          }
        }
      } catch {
        /* kaynak mail okunamazsa sebep yine gösterilir */
      }
    }

    return {
      durum: 'var',
      kayit: {
        id: j.id,
        email: j.email,
        sebep: j.origin,
        kaynakMailId: j.source_id ?? null,
        eklenme: j.created_at,
        kaynakMail,
      },
    }
  } catch (e: unknown) {
    return { durum: 'hata', detay: e instanceof Error ? e.message : 'bilinmiyor' }
  }
}

/** Adresi baskı listesinden çıkarır. */
export async function baskiyiKaldir(eposta: string): Promise<{ ok: true } | { ok: false; detay: string }> {
  const adres = eposta.trim().toLowerCase()
  if (!adres) return { ok: false, detay: 'adres boş' }
  try {
    const r = await fetch(`${TEMEL}/suppressions/${encodeURIComponent(adres)}`, {
      method: 'DELETE',
      headers: baslik(),
      cache: 'no-store',
    })
    if (r.status === 404) return { ok: true } // zaten listede değil
    if (!r.ok) return { ok: false, detay: `HTTP ${r.status}` }
    return { ok: true }
  } catch (e: unknown) {
    return { ok: false, detay: e instanceof Error ? e.message : 'bilinmiyor' }
  }
}
