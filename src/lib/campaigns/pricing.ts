import type { SupabaseClient } from '@supabase/supabase-js'
import { kuponMesaji } from './kuponMesaji'

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

  // Faz 25: hata metinleri tek sözlükten (kuponMesaji) geliyor. Önceden
  // burası "Geçersiz kod", sepet özeti ucu "Geçersiz ya da süresi dolmuş kod"
  // diyordu; aynı koda iki farklı cevap müşteriyi şaşırtıyordu.
  const k = data as Kampanya | null
  if (!k) return { gecerli: false, hata: kuponMesaji({ tip: 'bulunamadi' })! }
  if (!k.is_active) return { gecerli: false, hata: kuponMesaji({ tip: 'kapali' })! }
  if (henuzBaslamadi(k, simdi)) return { gecerli: false, hata: kuponMesaji({ tip: 'baslamadi' })! }
  if (suresiDoldu(k, simdi)) return { gecerli: false, hata: kuponMesaji({ tip: 'suresi_dolmus' })! }
  if (k.max_uses != null && (k.used_count ?? 0) >= k.max_uses) {
    return { gecerli: false, hata: 'Bu kodun kullanım hakkı dolmuş.' }
  }

  const altSinir = Number(k.min_cart_amount ?? 0)
  if (sepetTutari < altSinir) {
    return {
      gecerli: false,
      hata: kuponMesaji({
        tip: 'uygun_degil',
        sebep: 'Sepet tutarı yetersiz',
        eksikTutar: altSinir - sepetTutari,
      })!,
    }
  }

  const indirim = indirimTutari(k, sepetTutari)
  if (indirim <= 0) return { gecerli: false, hata: kuponMesaji({ tip: 'uygun_degil' })! }

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

  /**
   * Faz 15 — KURAL: birden fazla kampanya uygunsa MÜŞTERİ LEHİNE olan tek
   * kampanya uygulanır, indirimler TOPLANMAZ. Önceden hepsi toplanıyordu;
   * müşteri sepette "%30" görüp ödemede başka bir tutarla karşılaşabiliyor,
   * hangi kampanyanın geçerli olduğunu anlayamıyordu.
   */
  const enIyi = indirimler.reduce<OtomatikSonuc['indirimler'][number] | null>(
    (kazanan, aday) => (!kazanan || aday.amount > kazanan.amount ? aday : kazanan),
    null
  )
  const secilen = enIyi ? [enIyi] : []
  const toplam = enIyi ? Math.round(enIyi.amount * 100) / 100 : 0
  return { indirimler: secilen, ucretsizKargo, toplam: Math.min(toplam, sepetTutari) }
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


export type SecilenIndirim = {
  kampanyaId: string | null
  ad: string
  tutar: number
  kaynak: 'otomatik' | 'kod' | 'yok'
}

/**
 * Faz 15 kapanışı — TEK KAMPANYA KURALI.
 *
 * Otomatik kampanya ile kupon kodu birbirine EKLENMEZ: müşteri lehine olan
 * (en yüksek tutarlı) tek indirim uygulanır. Önceden ikisi toplanıyordu;
 * %30 otomatik + %10 kupon aynı sepette %40 indirim üretiyordu — hem ekranda
 * hem tahsilatta. Kural burada tek yerde kurulur, ödeme başlatma ucu ve ödeme
 * ekranı aynı sonucu okur.
 */
export function enIyiIndirim(
  otomatikler: { id: string; name: string; amount: number }[],
  kod: { id: string; name: string; amount: number } | null
): SecilenIndirim {
  const adaylar: SecilenIndirim[] = []
  for (const o of otomatikler) {
    if (Number(o.amount) > 0) {
      adaylar.push({ kampanyaId: o.id, ad: o.name, tutar: Number(o.amount), kaynak: 'otomatik' })
    }
  }
  if (kod && Number(kod.amount) > 0) {
    adaylar.push({ kampanyaId: kod.id, ad: kod.name, tutar: Number(kod.amount), kaynak: 'kod' })
  }
  if (adaylar.length === 0) return { kampanyaId: null, ad: '', tutar: 0, kaynak: 'yok' }
  return adaylar.reduce((kazanan, aday) => (aday.tutar > kazanan.tutar ? aday : kazanan))
}
