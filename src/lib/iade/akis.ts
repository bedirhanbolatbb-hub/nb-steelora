import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * İade akışının durum makinesi ve iz kaydı (Faz 20 · B planı).
 *
 * ÖNCEKİ HÂL: panelde iade onaylanır onaylanmaz iyzico'ya tam iade gidiyordu —
 * ürün hiç geri gelmese bile. Müşteriye giden tek mail "Siparişiniz İptal
 * Edildi" başlıklıydı ve içinde iade kodu, kargo firması ya da paketleme notu
 * yoktu; yani para gidiyor, ürünün dönmesi için hiçbir mekanizma yok.
 *
 * YENİ AKIŞ — onay ile para iadesi AYRILDI:
 *
 *   pending      talep alındı        → müşteriye DERHÂL teyit maili (MSY m.11/2)
 *   cargo_sent   onaylandı           → iade kodu + kargo firması + talimat maili
 *   inspecting   ürün teslim alındı  → panelde elle işaretlenir
 *   approved     para iade edildi    → iyzico iadesi + "iadeniz tamamlandı" maili
 *   rejected     reddedildi
 *
 * Durum değerleri order_requests.status CHECK kısıtında ZATEN tanımlı; yeni
 * DDL gerekmiyor.
 *
 * İZ KAYDI orders.metadata.iade_akisi altında tutulur: her adımın zaman
 * damgası ve müşteriye giden mailin kimliği. Ayrı sütun açmak yerine burada
 * tutuluyor çünkü order_requests'te yalnız tek bir `updated_at` var ve o her
 * geçişte eziliyor — geçmiş kaybolurdu.
 */

export type IadeAdimi = 'talep' | 'kod_gonderildi' | 'teslim_alindi' | 'iade_edildi' | 'reddedildi'

export type IadeAdimKaydi = {
  at: string
  mailId?: string | null
  /** Mail gönderilmediyse sebebi (güvenlik ağı kuralı vb.) */
  mailNotu?: string | null
  not?: string | null
}

export type IadeIzi = Partial<Record<IadeAdimi, IadeAdimKaydi>>

/** Panelde gösterilecek sıra — durum ne olursa olsun sabit. */
export const IADE_ADIMLARI: { adim: IadeAdimi; etiket: string }[] = [
  { adim: 'talep', etiket: 'Talep alındı' },
  { adim: 'kod_gonderildi', etiket: 'Onaylandı — kod gönderildi' },
  { adim: 'teslim_alindi', etiket: 'Ürün teslim alındı' },
  { adim: 'iade_edildi', etiket: 'Para iade edildi' },
]

export function iziOku(metadata: unknown): IadeIzi {
  const m = metadata as { iade_akisi?: IadeIzi } | null | undefined
  return m?.iade_akisi ?? {}
}

/**
 * Adımı siparişin metadata'sına işler.
 *
 * Oku-değiştir-yaz: metadata'da sözleşme onayı ve kişisel kupon kimliği de
 * duruyor, üzerine yazılmamalı.
 */
export async function adimKaydet(
  supabase: SupabaseClient,
  orderId: string,
  adim: IadeAdimi,
  kayit: Omit<IadeAdimKaydi, 'at'> & { at?: string } = {}
): Promise<void> {
  try {
    const { data } = await supabase.from('orders').select('metadata').eq('id', orderId).maybeSingle()
    const mevcut = (data?.metadata ?? {}) as Record<string, unknown>
    const iz = (mevcut.iade_akisi ?? {}) as IadeIzi

    await supabase
      .from('orders')
      .update({
        metadata: {
          ...mevcut,
          iade_akisi: { ...iz, [adim]: { at: kayit.at ?? new Date().toISOString(), ...kayit } },
        },
      })
      .eq('id', orderId)
  } catch (e: any) {
    // İz yazılamazsa akış durmaz: para/kargo işlemleri iz kaydından bağımsız.
    console.error('[iade-akisi] adım kaydedilemedi:', adim, e?.message)
  }
}

/**
 * Para iadesi için ön koşul: ürün teslim alınmış olmalı.
 *
 * GÜVENLİK AĞI — bu kontrol olmadan panelde yanlış düğmeye basmak, ürün elimize
 * hiç geçmeden parayı göndermek anlamına gelirdi.
 */
export function paraIadesineHazirMi(talepDurumu: string): boolean {
  return talepDurumu === 'inspecting'
}

/** Müşterinin ürünü geri göndermesi için son gün (MSY m.13/1: bildirimden 14 gün). */
export function sonGonderimGunu(bildirimTarihi: string | Date, gun: number): Date {
  const d = new Date(bildirimTarihi)
  d.setDate(d.getDate() + gun)
  return d
}
