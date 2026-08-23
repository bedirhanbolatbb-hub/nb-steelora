import { createServiceClient } from '@/lib/supabase/service'
import { sendMail } from '@/lib/emails/send'
import { bildirimAdresi } from '@/lib/emails/bildirim'
import { kritikUyariEmail } from '@/lib/emails/templates'

/**
 * Kritik hata uyarıları (Faz 19).
 *
 * Faz 19 ölçümü: ödeme başlatma hatası, sync başarısızlığı, webhook imza
 * hatası ve stok yazımı hatası — dördü de yalnız `console`'a yazıyordu.
 * Vercel logu kimse bakmadıkça sessizdir; site ya da ödeme saatlerce bozuk
 * kalabilirdi. Artık dördü de BB'ye mail atıyor.
 *
 * SPAM KORUMASI: aynı uyarı tipi için saatte BİR mail. Kalıcı bir arıza
 * (iyzico kesintisi gibi) dakikada onlarca istek üretir; hepsine mail atmak
 * uyarıyı işe yaramaz hâle getirirdi. Bastırılan tekrarlar sayılıyor ve bir
 * sonraki mailde "son 1 saatte N kez" diye bildiriliyor.
 *
 * PARMAK İZİ: aynı tipte AMA farklı bir hata geldiğinde pencere beklenmez.
 * "Kart reddedildi" ile "iyzico erişilemiyor" ayrı olaylardır.
 */

export type UyariTipi = 'odeme_baslatma' | 'sync_basarisiz' | 'webhook_imza' | 'stok_yazimi'

const PENCERE_MS = 60 * 60 * 1000

/**
 * Tablo kurulmadıysa (DDL inmediyse) kullanılan yedek hafıza.
 * Vercel'de örnek başına ayrıdır ve soğuk başlangıçta sıfırlanır — yani
 * eksik korur, fazla mail atar. Haber alamamaktan iyidir.
 */
const bellekPenceresi = new Map<string, number>()

function bellekIzinVeriyorMu(anahtar: string, simdi: number): boolean {
  const son = bellekPenceresi.get(anahtar) ?? 0
  if (simdi - son < PENCERE_MS) return false
  bellekPenceresi.set(anahtar, simdi)
  if (bellekPenceresi.size > 200) bellekPenceresi.clear()
  return true
}

type Karar = { gonder: boolean; bastirilan: number; ilkGorulme: string | null }

/**
 * Pencere kararı. Yarış durumunda (aynı anda iki istek) en kötü ihtimalle
 * bir mail fazladan gider — PostgREST koşullu UPSERT desteklemediği için
 * okuma+yazma iki çağrı; bu kadarlık bir yarış kabul edilebilir.
 */
async function pencereKarari(tip: UyariTipi, parmakIzi: string, payload: unknown): Promise<Karar> {
  const simdi = new Date()
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('alert_state')
      .select('key, last_sent_at, fingerprint, count, first_seen_at')
      .eq('key', tip)
      .maybeSingle()

    if (error) throw error

    const yeniHata = !data || data.fingerprint !== parmakIzi
    const pencereDoldu = !data || simdi.getTime() - new Date(data.last_sent_at).getTime() >= PENCERE_MS
    const gonder = yeniHata || pencereDoldu

    await supabase.from('alert_state').upsert(
      {
        key: tip,
        fingerprint: parmakIzi,
        // Gönderiyorsak pencereyi şimdiden başlat; göndermiyorsak eski damga
        // korunur ki pencere uzamasın.
        last_sent_at: gonder ? simdi.toISOString() : (data?.last_sent_at ?? simdi.toISOString()),
        count: gonder ? 1 : (data?.count ?? 0) + 1,
        first_seen_at: yeniHata ? simdi.toISOString() : (data?.first_seen_at ?? simdi.toISOString()),
        payload: payload ?? null,
        updated_at: simdi.toISOString(),
      },
      { onConflict: 'key' }
    )

    return {
      gonder,
      bastirilan: gonder ? (data && !yeniHata ? data.count ?? 0 : 0) : 0,
      ilkGorulme: data?.first_seen_at ?? null,
    }
  } catch {
    // Tablo yok ya da DB erişilemiyor: bellek yedeğine düş.
    return {
      gonder: bellekIzinVeriyorMu(`${tip}|${parmakIzi}`, simdi.getTime()),
      bastirilan: 0,
      ilkGorulme: null,
    }
  }
}

/** Parmak izi: aynı hatanın tekrarını tanımak için sadeleştirilmiş özet. */
function parmakIziUret(mesaj: string): string {
  return mesaj
    .slice(0, 200)
    .replace(/\d{4,}/g, 'N')          // sipariş no, id, zaman damgası
    .replace(/[0-9a-f]{8}-[0-9a-f-]+/gi, 'UUID')
    .trim()
}

export async function kritikUyari(params: {
  tip: UyariTipi
  baslik: string
  mesaj: string
  detay?: Record<string, unknown>
}): Promise<{ gonderildi: boolean; sebep?: string }> {
  try {
    const parmakIzi = parmakIziUret(params.mesaj)
    const karar = await pencereKarari(params.tip, parmakIzi, {
      baslik: params.baslik,
      mesaj: params.mesaj.slice(0, 1000),
      ...params.detay,
    })

    if (!karar.gonder) return { gonderildi: false, sebep: 'pencere' }

    const alici = await bildirimAdresi()
    const mail = kritikUyariEmail({
      baslik: params.baslik,
      mesaj: params.mesaj,
      tip: params.tip,
      bastirilan: karar.bastirilan,
      ilkGorulme: karar.ilkGorulme,
      detay: params.detay ?? null,
    })
    await sendMail({ to: alici, subject: mail.subject, html: mail.html, label: 'Kritik uyarı' })
    return { gonderildi: true }
  } catch (e: any) {
    // Uyarı gönderimi ASLA çağıranı düşürmez: ödeme ya da senkron akışının
    // içinden çağrılıyor.
    console.error('[uyari] gönderilemedi:', e?.message)
    return { gonderildi: false, sebep: e?.message }
  }
}
