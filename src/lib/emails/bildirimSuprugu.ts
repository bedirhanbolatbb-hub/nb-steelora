import { createServiceClient } from '@/lib/supabase/service'
import { adminNewOrderEmail } from './templates'
import { sendMail } from './send'
import { bildirimAdresi } from './bildirim'

/**
 * Yönetici bildirimi emniyet ağı (Faz 29).
 *
 * İlk gerçek siparişte bildirim maili kayboldu ve BB siparişten haberdar
 * olmadı. Bildirimin ödeme callback'inin son adımı olması yapısal bir
 * kırılganlıktı: o zincirde herhangi bir yerde süre dolarsa kaybolan tam
 * olarak son adım oluyor.
 *
 * Callback artık gönderimi siparişe DAMGALIYOR. Burası damgasız kalanları
 * bulup gönderiyor — yani bildirim, callback'in tamamlanmasına bağlı olmaktan
 * çıkıyor. Gecelik sağlık işinden çağrılır.
 */

export type SuprukSonucu = {
  bakilan: number
  gonderilen: number
  hata: number
  siparisler: string[]
}

/** Bu tür daha önce damgalandı mı? */
export async function bildirimDamgasi(orderId: string, tur: string): Promise<string | null> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('orders').select('metadata').eq('id', orderId).maybeSingle()
    const d = (data?.metadata as any)?.bildirim?.[tur]
    return typeof d === 'string' ? d : null
  } catch {
    // Okunamazsa "damgasız" varsayılır: iki mail, hiç mail olmamasından iyidir.
    return null
  }
}

/** Gönderim damgası — orders.metadata.bildirim.<tur> = ISO zaman. */
export async function bildirimDamgala(orderId: string, tur: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase.from('orders').select('metadata').eq('id', orderId).maybeSingle()
    const mevcut = (data?.metadata as Record<string, unknown>) ?? {}
    const bildirim = (mevcut.bildirim as Record<string, unknown>) ?? {}
    await supabase
      .from('orders')
      .update({ metadata: { ...mevcut, bildirim: { ...bildirim, [tur]: new Date().toISOString() } } })
      .eq('id', orderId)
  } catch (e: any) {
    // Damga konamazsa süpürge aynı siparişi tekrar gönderebilir. İki bildirim,
    // hiç bildirim olmamasından iyidir.
    console.error('[bildirim] damga konamadı:', e?.message)
  }
}

/**
 * Son `saat` içinde ödemesi alınmış ama yönetici bildirimi damgalanmamış
 * siparişleri bulup bildirimi gönderir.
 *
 * Pencere bilerek dar: çok eski bir siparişi bugün bildirmek kafa karıştırır.
 */
export async function bildirimleriSupur(saat = 48): Promise<SuprukSonucu> {
  const sonuc: SuprukSonucu = { bakilan: 0, gonderilen: 0, hata: 0, siparisler: [] }
  try {
    const supabase = createServiceClient()
    const sinir = new Date(Date.now() - saat * 3_600_000).toISOString()
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', sinir)
      // Ödemesi gerçekten alınmış siparişler; 'pending' ve iptaller hariç.
      .in('status', ['paid', 'preparing', 'shipped', 'delivered'])
      .order('created_at', { ascending: true })

    if (error || !data) return sonuc

    const alici = await bildirimAdresi()
    for (const o of data) {
      sonuc.bakilan++
      const damga = (o.metadata as any)?.bildirim?.yeni_siparis
      if (damga) continue
      try {
        const bildirim = adminNewOrderEmail(o)
        const gonderim = await sendMail({
          to: alici,
          ...bildirim,
          label: 'Admin new order (süpürge)',
        })
        if (gonderim.error) {
          sonuc.hata++
          continue
        }
        await bildirimDamgala(o.id, 'yeni_siparis')
        sonuc.gonderilen++
        sonuc.siparisler.push(o.order_number ?? o.id)
      } catch {
        sonuc.hata++
      }
    }
  } catch (e: any) {
    console.error('[bildirim] süpürge hatası:', e?.message)
  }
  return sonuc
}
