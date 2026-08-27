import { createServiceClient } from '@/lib/supabase/service'

/**
 * "Üye olursanız %X indirim" satırının TEK KAYNAĞI (Faz 11E).
 *
 * BB üyelere özel kampanya kurduğunda site bunu görünür kılmalı — ama YALNIZ
 * böyle aktif bir kampanya varsa. Kampanya yoksa hiçbir yerde hiçbir şey
 * basılmaz: olmayan bir indirimi vaat etmek marka sesi belgesinin de
 * (docs/marka-sesi.md) ilk kuralına aykırı.
 *
 * GİZLİ KAMPANYA SIZDIRILMAZ: kod gerektiren kampanyalar bu duyuruya HİÇ
 * girmez — onların varlığı yalnız kodu verdiğimiz kişilerce bilinir.
 */
export type UyelikTesviki = { oran: number; tip: 'percent' | 'fixed'; ad: string }

export async function uyelikTesvikiGetir(): Promise<UyelikTesviki | null> {
  try {
    const supabase = createServiceClient()
    const simdi = new Date().toISOString()
    const { data } = await supabase
      .from('campaigns')
      .select('name, discount_type, discount_value, starts_at, ends_at, requires_code, members_only, is_active')
      .eq('is_active', true)
      .eq('members_only', true)
      .eq('requires_code', false) // gizli kampanya duyurulmaz
      .or(`starts_at.is.null,starts_at.lte.${simdi}`)
      .or(`ends_at.is.null,ends_at.gte.${simdi}`)
      .order('discount_value', { ascending: false })
      .limit(1)

    const k = data?.[0]
    if (!k || !k.discount_value) return null
    return {
      oran: Number(k.discount_value),
      tip: (k.discount_type ?? 'percent') === 'fixed' ? 'fixed' : 'percent',
      ad: String(k.name ?? ''),
    }
  } catch {
    // Teşvik satırı süs değil ama akışın da önüne geçmez: okunamazsa basılmaz.
    return null
  }
}

/** Ekranda basılacak kısa cümle — marka sesi: baskı yok, ünlem yok. */
export function uyelikTesvikCumlesi(t: UyelikTesviki, baglam: 'kayit' | 'sepet' | 'odeme'): string {
  const deger = t.tip === 'fixed' ? `${t.oran} ₺` : `%${t.oran}`
  if (baglam === 'kayit') return `Üyelere özel ${deger} indirim bu hesapla geçerli olur.`
  if (baglam === 'sepet') return `Üye olursanız bu siparişte ${deger} indirim uygulanır.`
  return `Üyelere özel ${deger} indirim var; üye girişiyle sepetinize uygulanır.`
}
