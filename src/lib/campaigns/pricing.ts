import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * İndirim motorunun TEK kaynağı (Faz 11).
 *
 * Kupon doğrulama ve tutar hesabı üç yerde ayrı ayrı yazılmıştı; ödeme başlatma
 * ucu ise indirimi hiç hesaba katmıyordu (müşteri ekranda indirimli tutarı
 * görüyor, karttan brüt tutar çekiliyordu). Artık üç yol da buradan geçer:
 *   - /api/discount/apply      (müşteri kodu dener)
 *   - /api/discount/auto-apply (otomatik kampanyalar)
 *   - /api/payment/initialize  (ödemeden HEMEN önce yeniden doğrulama)
 *
 * İstemciden gelen indirim tutarına asla güvenilmez; ödeme anında kod yeniden
 * doğrulanıp tutar sunucuda hesaplanır.
 */

export type Kampanya = {
  id: string
  name: string
  code: string | null
  type: string
  discount_type: string | null
  discount_value: number | null
  min_cart_amount: number | null
  max_uses: number | null
  used_count: number | null
  starts_at: string | null
  ends_at: string | null
  is_active: boolean | null
  metadata: any
}

export type GecerlilikSonuc =
  | { gecerli: true; kampanya: Kampanya; indirim: number }
  | { gecerli: false; hata: string }

/**
 * Kampanya şu anda yürürlükte mi? (aktif + tarih penceresi + kullanım limiti)
 *
 * Tarihler timestamptz olarak saklandığı için karşılaştırma mutlak zamanda
 * yapılır; sunucunun saat dilimi sonucu değiştirmez. Panelde girilen yerel
 * saat de aynı mutlak ana denk gelir.
 */
export function yururlukte(k: Kampanya, simdi: Date = new Date()): boolean {
  if (!k.is_active) return false
  if (k.starts_at && new Date(k.starts_at) > simdi) return false
  if (k.ends_at && new Date(k.ends_at) < simdi) return false
  if (k.max_uses != null && (k.used_count ?? 0) >= k.max_uses) return false
  return true
}

/** Süresi dolmuş mu? (panelde rozet için — is_active'ten bağımsız bilgi) */
export function suresiDoldu(k: { ends_at: string | null }, simdi: Date = new Date()): boolean {
  return Boolean(k.ends_at && new Date(k.ends_at) < simdi)
}

export function henuzBaslamadi(k: { starts_at: string | null }, simdi: Date = new Date()): boolean {
  return Boolean(k.starts_at && new Date(k.starts_at) > simdi)
}

/**
 * Kampanyanın sepete uyguladığı indirim tutarı.
 * discount_type/discount_value eksikse 0 döner — hesap patlamaz, sessizce
 * indirimsiz devam eder (eski kod burada NaN/null üretiyordu).
 */
export function indirimTutari(k: Kampanya, sepetTutari: number): number {
  const deger = Number(k.discount_value)
  if (!Number.isFinite(deger) || deger <= 0) return 0

  const ham = k.discount_type === 'percent' ? (sepetTutari * deger) / 100 : deger
  if (!Number.isFinite(ham) || ham <= 0) return 0

  // İndirim sepeti aşamaz; kuruşa yuvarlanır.
  return Math.round(Math.min(ham, sepetTutari) * 100) / 100
}

/** Kupon kodunu doğrular ve indirimi hesaplar. */
export async function kuponDogrula(
  supabase: SupabaseClient,
  kod: string,
  sepetTutari: number,
  simdi: Date = new Date()
): Promise<GecerlilikSonuc> {
  const temizKod = (kod || '').trim().toUpperCase()
  if (!temizKod) return { gecerli: false, hata: 'Kod girin' }

  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .eq('type', 'discount_code')
    .eq('code', temizKod)
    .maybeSingle()

  const k = data as Kampanya | null
  if (!k || !k.is_active) return { gecerli: false, hata: 'Geçersiz kod' }
  if (henuzBaslamadi(k, simdi)) return { gecerli: false, hata: 'Kampanya henüz başlamadı' }
  if (suresiDoldu(k, simdi)) return { gecerli: false, hata: 'Kampanya süresi doldu' }
  if (k.max_uses != null && (k.used_count ?? 0) >= k.max_uses) {
    return { gecerli: false, hata: 'Kampanya kullanım limiti doldu' }
  }

  const altSinir = Number(k.min_cart_amount ?? 0)
  if (sepetTutari < altSinir) {
    return { gecerli: false, hata: `Minimum ${altSinir.toFixed(2)} TL sepet tutarı gerekli` }
  }

  const indirim = indirimTutari(k, sepetTutari)
  if (indirim <= 0) return { gecerli: false, hata: 'Bu kod şu an indirim üretmiyor' }

  return { gecerli: true, kampanya: k, indirim }
}

export type OtomatikSonuc = {
  indirimler: { id: string; name: string; type: string; amount: number }[]
  ucretsizKargo: boolean
  toplam: number
}

/** Kod gerektirmeyen kampanyalar (sepet indirimi, ücretsiz kargo, X al Y öde). */
export async function otomatikKampanyalar(
  supabase: SupabaseClient,
  sepetTutari: number,
  urunSayisi: number,
  urunFiyatlari: number[],
  simdi: Date = new Date()
): Promise<OtomatikSonuc> {
  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_active', true)
    .in('type', ['cart_discount', 'free_shipping', 'buy_x_get_y'])

  const indirimler: OtomatikSonuc['indirimler'] = []
  let ucretsizKargo = false

  for (const ham of (data || []) as Kampanya[]) {
    // Tarih/limit penceresi tek yerden — süresi dolmuş kampanya asla sayılmaz.
    if (!yururlukte(ham, simdi)) continue
    const altSinir = Number(ham.min_cart_amount ?? 0)

    if (ham.type === 'cart_discount' && sepetTutari >= altSinir) {
      const tutar = indirimTutari(ham, sepetTutari)
      if (tutar > 0) indirimler.push({ id: ham.id, name: ham.name, type: 'cart_discount', amount: tutar })
    }

    if (ham.type === 'free_shipping' && sepetTutari >= altSinir) {
      ucretsizKargo = true
    }

    if (ham.type === 'buy_x_get_y') {
      // metadata eksikse kampanya uygulanmaz — varsayılan sayı uydurulmaz.
      const alQty = Number(ham.metadata?.buy_quantity)
      const odeQty = Number(ham.metadata?.pay_quantity)
      if (!Number.isFinite(alQty) || !Number.isFinite(odeQty)) continue
      const bedava = alQty - odeQty
      if (bedava <= 0 || urunSayisi < alQty || urunFiyatlari.length === 0) continue

      const sirali = [...urunFiyatlari].sort((a, b) => a - b)
      const tutar = sirali.slice(0, bedava).reduce((t, p) => t + (Number(p) || 0), 0)
      if (tutar > 0) {
        indirimler.push({
          id: ham.id,
          name: ham.name,
          type: 'buy_x_get_y',
          amount: Math.round(Math.min(tutar, sepetTutari) * 100) / 100,
        })
      }
    }
  }

  const toplam = Math.round(indirimler.reduce((t, d) => t + d.amount, 0) * 100) / 100
  return { indirimler, ucretsizKargo, toplam: Math.min(toplam, sepetTutari) }
}

/** Kampanya kullanıldığında sayacı artırır (ödeme başarıyla tamamlandığında). */
export async function kullanimArtir(supabase: SupabaseClient, kampanyaId: string): Promise<void> {
  const { data } = await supabase
    .from('campaigns')
    .select('used_count')
    .eq('id', kampanyaId)
    .maybeSingle()
  if (!data) return
  await supabase
    .from('campaigns')
    .update({ used_count: (data.used_count ?? 0) + 1 })
    .eq('id', kampanyaId)
}
