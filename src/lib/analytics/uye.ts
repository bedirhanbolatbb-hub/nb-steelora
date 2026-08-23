import { createClient } from '@/lib/supabase/server'

/**
 * Giriş yapmış üyenin kimliği — ölçüm için (Faz 23-B).
 *
 * KVKK kapısı: aydınlatma metnindeki "Üyeler için" paragrafı, 13 aylık
 * saklama, hesapla birlikte silinme (ON DELETE CASCADE) ve panelden silme
 * düğmesi hazır olmadan bu bağlantı kurulmaz.
 *
 * Çerezden `sub` iddiasını okumak bir ağ gidiş-dönüşü kazandırırdı ama
 * doğrulanmamış olurdu; uydurulmuş bir çerez hareketleri BAŞKA bir üyenin
 * hesabına yazdırabilirdi. Bu yüzden doğrulanmış çağrı kullanılır ve çağıran
 * taraf bunu yanıt gönderildikten sonra (`after`) çalıştırır.
 */
export async function uyeKimligi(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    // Oturum okunamazsa olay misafir olarak yazılır — ölçüm düşmez.
    return null
  }
}
