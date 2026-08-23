import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Bs bildirimi eşiği uyarısı (Faz 28).
 *
 * Nihai tüketiciye kesilen faturada TC kimlik/vergi numarası bulunma
 * zorunluluğu YOK. TEK istisna: aynı müşteriye aynı gün içinde KDV hariç
 * 5.000 TL üzeri satış — o zaman Form Bs bildirimi için kimlik numarası
 * gerekir.
 *
 * Bu yüzden numara HERKESTEN toplanmıyor. Panel yalnızca eşiğin aşıldığı
 * siparişte uyarı gösterir; BB gerekirse müşteriden ayrıca ister.
 *
 * Eşik KDV HARİÇ tutara uygulanır. Vitrin fiyatları KDV dahil olduğu için
 * brüt tutar KDV oranına bölünerek matrah bulunur.
 */

/** Form Bs bildirim eşiği — KDV hariç, TL. */
export const BS_ESIGI_TL = 5000

/** Takıda uygulanan KDV oranı. Mevzuat değişirse tek yer güncellenir. */
export const KDV_ORANI = 0.2

/** KDV dahil tutardan matrahı (KDV hariç) bulur. */
export function kdvHaric(kdvDahil: number): number {
  return Math.round((kdvDahil / (1 + KDV_ORANI)) * 100) / 100
}

export type BsDurumu = {
  /** Eşik aşıldı mı? */
  asildi: boolean
  /** Aynı gün aynı müşteriye yapılan toplam satış (KDV dahil). */
  gunlukToplam: number
  /** Aynı günkü sipariş sayısı. */
  siparisSayisi: number
  /** KDV hariç karşılığı. */
  matrah: number
}

/**
 * Bu siparişin müşterisine, siparişin AÇILDIĞI GÜN içinde yapılan toplam
 * satışı hesaplar ve eşiği aşıp aşmadığını söyler.
 *
 * Eşleştirme e-posta üzerinden: misafir siparişte başka bir bağ yok. İptal ve
 * iade edilmiş siparişler sayılmaz — onlar için fatura da kesilmiyor.
 * Gün sınırı İstanbul saatine göre.
 */
export async function bsDurumu(
  supabase: SupabaseClient,
  eposta: string | null | undefined,
  siparisTarihi: string | null | undefined
): Promise<BsDurumu | null> {
  const e = (eposta ?? '').trim().toLowerCase()
  if (!e || !siparisTarihi) return null

  // İstanbul takvimine göre günün sınırları.
  const gun = new Date(siparisTarihi).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
  const bas = `${gun}T00:00:00+03:00`
  const bit = `${gun}T23:59:59.999+03:00`

  const { data, error } = await supabase
    .from('orders')
    .select('total, status')
    .ilike('guest_email', e)
    .gte('created_at', bas)
    .lte('created_at', bit)

  if (error || !data) return null

  const sayilan = data.filter(
    (o: any) => !['cancelled', 'refunded', 'pending'].includes(String(o.status))
  )
  const gunlukToplam = Math.round(sayilan.reduce((t: number, o: any) => t + (Number(o.total) || 0), 0) * 100) / 100
  const matrah = kdvHaric(gunlukToplam)

  return {
    asildi: matrah > BS_ESIGI_TL,
    gunlukToplam,
    siparisSayisi: sayilan.length,
    matrah,
  }
}
