import { createServiceClient } from '@/lib/supabase/service'
import { HESAP_SILME_HTML } from './metinler'

/**
 * "Hesabınızı silme" bölümü (Faz 14).
 *
 * Panelden `hesap_silme_metni` anahtarıyla düzenlenebilir; boşsa koddaki
 * varsayılan basılır — metin hiçbir koşulda sayfadan düşmez.
 */
export async function hesapSilmeMetniGetir(): Promise<string> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('site_content')
      .select('value')
      .eq('key', 'hesap_silme_metni')
      .maybeSingle()
    const deger = (data?.value ?? '').trim()
    return deger || HESAP_SILME_HTML
  } catch {
    return HESAP_SILME_HTML
  }
}
