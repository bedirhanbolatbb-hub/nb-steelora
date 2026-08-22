import { createServiceClient } from '@/lib/supabase/service'

/** Panelden değiştirilebilir yönetici bildirim adresi (site_content: bildirim_eposta). */
const VARSAYILAN = 'info@nbsteelora.com'

/**
 * Sipariş/talep/yorum bildirimlerinin gideceği adres (Faz 15).
 * Panelden boşaltılırsa varsayılana düşer — bildirim hiçbir koşulda kaybolmaz.
 */
export async function bildirimAdresi(): Promise<string> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('site_content')
      .select('value')
      .eq('key', 'bildirim_eposta')
      .maybeSingle()
    const deger = (data?.value ?? '').trim()
    return deger.includes('@') ? deger : VARSAYILAN
  } catch {
    return VARSAYILAN
  }
}
