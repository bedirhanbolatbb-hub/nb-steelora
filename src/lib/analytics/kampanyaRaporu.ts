import { createServiceClient } from '@/lib/supabase/service'

/**
 * Kampanya bazlı kullanım raporu (Faz 11E).
 *
 * "Kampanya işe yaradı mı?" sorusunun cevabı hiçbir ekranda yoktu: panelde
 * kampanyanın kurulduğu görülüyor, sonucu görünmüyordu. Bu rapor siparişlerden
 * (tek doğruluk kaynağı) sayar — kampanya motorunun kendi sayaçlarına değil,
 * gerçekten tamamlanmış siparişlere bakar.
 *
 * İPTAL/İADE DIŞARIDA: yalnız ödemesi alınmış ve devam eden siparişler sayılır
 * (paid/preparing/shipped/delivered/completed) — iptal edilmiş bir sipariş
 * kampanyanın başarısı değildir.
 */
export type KampanyaOzeti = {
  id: string
  ad: string
  aktif: boolean
  gizli: boolean
  kullanim: number
  toplamIndirim: number
  toplamCiro: number
  ortalamaSepet: number
}

const SAYILAN_DURUMLAR = ['paid', 'preparing', 'shipped', 'delivered', 'completed']

export async function kampanyaRaporu(bas: Date, bit: Date): Promise<KampanyaOzeti[]> {
  const supabase = createServiceClient()

  const [{ data: siparisler }, { data: kampanyalar }] = await Promise.all([
    supabase
      .from('orders')
      .select('applied_campaign_id, discount_amount, total, status, created_at')
      .gte('created_at', bas.toISOString())
      .lte('created_at', bit.toISOString())
      .in('status', SAYILAN_DURUMLAR)
      .not('applied_campaign_id', 'is', null),
    supabase.from('campaigns').select('id, name, is_active, requires_code'),
  ])

  const kampanyaBilgi = new Map(
    (kampanyalar || []).map((k) => [
      k.id as string,
      { ad: String(k.name ?? ''), aktif: Boolean(k.is_active), gizli: Boolean(k.requires_code) },
    ])
  )

  const toplam = new Map<string, { kullanim: number; indirim: number; ciro: number }>()
  for (const o of siparisler || []) {
    const id = o.applied_campaign_id as string
    const mevcut = toplam.get(id) ?? { kullanim: 0, indirim: 0, ciro: 0 }
    mevcut.kullanim += 1
    mevcut.indirim += Number(o.discount_amount) || 0
    mevcut.ciro += Number(o.total) || 0
    toplam.set(id, mevcut)
  }

  return [...toplam.entries()]
    .map(([id, t]) => {
      const bilgi = kampanyaBilgi.get(id)
      return {
        id,
        ad: bilgi?.ad ?? '(silinmiş kampanya)',
        aktif: bilgi?.aktif ?? false,
        gizli: bilgi?.gizli ?? false,
        kullanim: t.kullanim,
        toplamIndirim: Math.round(t.indirim * 100) / 100,
        toplamCiro: Math.round(t.ciro * 100) / 100,
        ortalamaSepet: t.kullanim ? Math.round((t.ciro / t.kullanim) * 100) / 100 : 0,
      }
    })
    .sort((a, b) => b.kullanim - a.kullanim || b.toplamCiro - a.toplamCiro)
}
