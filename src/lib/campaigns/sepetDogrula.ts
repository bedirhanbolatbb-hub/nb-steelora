import type { SupabaseClient } from '@supabase/supabase-js'
import type { SepetKalemi } from './hesap'

/**
 * Sepet kalemlerinin sunucuda doğrulanması (Faz 17).
 *
 * BULUNAN AÇIK: ödeme başlatma ucu sepet ara toplamını İSTEMCİDEN gelen
 * `item.price` ile hesaplıyordu. İndirim sunucuda yeniden doğrulanıyordu ama
 * TABAN FİYAT doğrulanmıyordu — yani istekte fiyatı düşürüp ürünü ucuza almak
 * mümkündü. Artık fiyat, adet dışındaki her şey veritabanından okunuyor:
 * istemciden yalnız "hangi üründen kaç adet" bilgisi kabul edilir.
 *
 * Aynı sorgu kalemin kategorisini ve koleksiyonlarını da getirir; kapsamlı
 * kampanyalar (kategori/koleksiyon/ürün bazlı) bu bilgiye ihtiyaç duyar ve
 * onlar da istemciden gelemez.
 */

export type DogrulanmisSepet = {
  kalemler: SepetKalemi[]
  araToplam: number
  /** İstemcinin gönderdiği fiyat ile DB fiyatının ayrıştığı kalemler. */
  fiyatFarklari: { productId: string; istemci: number; sunucu: number }[]
  /** Bulunamayan / pasif ürünler — sipariş bunlarla sürdürülmez. */
  gecersizler: string[]
}

export async function sepetiDogrula(
  supabase: SupabaseClient,
  istemciKalemleri: { productId?: string; quantity?: number; price?: number }[]
): Promise<DogrulanmisSepet> {
  const istenen = new Map<string, number>()
  for (const kalem of istemciKalemleri ?? []) {
    const id = String(kalem?.productId ?? '').trim()
    if (!id) continue
    const adet = Math.max(0, Math.floor(Number(kalem?.quantity) || 0))
    if (adet <= 0) continue
    istenen.set(id, (istenen.get(id) ?? 0) + adet)
  }

  if (istenen.size === 0) {
    return { kalemler: [], araToplam: 0, fiyatFarklari: [], gecersizler: [] }
  }

  const kimlikler = [...istenen.keys()]
  const { data: urunler } = await supabase
    .from('products_display')
    .select('id, slug, display_title, display_price, trendyol_category, trendyol_barcode, trendyol_stock')
    .in('id', kimlikler)

  // Koleksiyon üyeliği ayrı tabloda (collections.product_ids) tutuluyor.
  const { data: koleksiyonlar } = await supabase
    .from('collections')
    .select('slug, product_ids')
    .eq('is_active', true)

  const koleksiyonHaritasi = new Map<string, string[]>()
  for (const k of koleksiyonlar ?? []) {
    for (const pid of (k.product_ids as string[] | null) ?? []) {
      const liste = koleksiyonHaritasi.get(pid) ?? []
      liste.push(k.slug)
      koleksiyonHaritasi.set(pid, liste)
    }
  }

  const kalemler: SepetKalemi[] = []
  const fiyatFarklari: DogrulanmisSepet['fiyatFarklari'] = []
  const gecersizler: string[] = []

  for (const id of kimlikler) {
    const urun = (urunler ?? []).find((u: { id: string }) => u.id === id)
    if (!urun) {
      gecersizler.push(id)
      continue
    }
    const adet = istenen.get(id) ?? 0
    const sunucuFiyat = Number(urun.display_price) || 0
    const istemciFiyat = Number(
      (istemciKalemleri ?? []).find((k) => String(k?.productId ?? '') === id)?.price ?? sunucuFiyat
    )
    if (Math.abs(istemciFiyat - sunucuFiyat) > 0.009) {
      fiyatFarklari.push({ productId: id, istemci: istemciFiyat, sunucu: sunucuFiyat })
    }

    kalemler.push({
      productId: id,
      ad: urun.display_title ?? undefined,
      fiyat: sunucuFiyat,
      adet,
      kategori: urun.trendyol_category ?? null,
      koleksiyonlar: koleksiyonHaritasi.get(id) ?? [],
      barkod: urun.trendyol_barcode ?? null,
    })
  }

  const araToplam = Math.round(kalemler.reduce((t, k) => t + k.fiyat * k.adet, 0) * 100) / 100
  return { kalemler, araToplam, fiyatFarklari, gecersizler }
}
