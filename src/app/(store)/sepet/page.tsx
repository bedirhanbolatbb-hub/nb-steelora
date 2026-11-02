import type { Metadata } from 'next'
import { getCouponReminder } from '@/lib/campaigns.server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { paylasimCoz } from '@/lib/sepet/paylasim'
import type { Product } from '@/types'
import CartPageClient from './CartPageClient'

// Kupon bilgisi sunucuda okunur, sepet içeriği istemcide (localStorage) kalır.
/**
 * İşlevsel sayfa — arama sonucunda yeri yok (Faz 11F kapanış denetimi).
 *
 * Kendi başlığı/açıklaması olmadığı için ana sayfanın metnini birebir
 * tekrarlıyordu ve index,follow ile taranıyordu; Search Console bunu
 * "yinelenen içerik, kullanıcı tarafından kurallı etiket seçilmedi" diye
 * eliyor. follow açık kalır: içindeki bağlantılar izlenmeye devam eder.
 */
export const metadata: Metadata = {
  title: 'Sepet',
  robots: { index: false, follow: true },
}

export type PaylasilanKalem = { product: Product; quantity: number; tukendi: boolean }

/**
 * Faz 35: paylaşılan sepet. Ürünler sunucuda, ürün sayfasıyla AYNI kaynaktan
 * okunur (yalnız yayındaki ürünler; özel fiyat ürün tablosundan). Pasife
 * alınmış ürün listeye girmez.
 */
async function paylasilaniGetir(ham: string | undefined): Promise<PaylasilanKalem[]> {
  const kalemler = paylasimCoz(ham)
  if (!kalemler.length) return []
  const ids = kalemler.map((k) => k.id)
  const supabase = await createClient()
  const service = createServiceClient()
  const [{ data: urunler }, { data: fiyatlar }] = await Promise.all([
    supabase.from('products_display').select('*').in('id', ids),
    service.from('products').select('id, override_price').in('id', ids),
  ])
  const ozelFiyat = new Map((fiyatlar ?? []).map((f: { id: string; override_price: number | null }) => [f.id, f.override_price]))
  const harita = new Map((urunler ?? []).map((u: Product) => [u.id, u]))
  const sonuc: PaylasilanKalem[] = []
  for (const k of kalemler) {
    const u = harita.get(k.id) as (Product & Record<string, unknown>) | undefined
    if (!u) continue
    sonuc.push({
      // Ürün sayfasındaki gibi: ham pazaryeri açıklaması istemciye gitmez.
      product: {
        ...u,
        trendyol_description: null,
        override_description: null,
        override_price: ozelFiyat.get(u.id) ?? (u.override_price as number | null) ?? null,
      } as unknown as Product,
      quantity: k.adet,
      tukendi: Number(u.trendyol_stock ?? 0) <= 0,
    })
  }
  return sonuc
}

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ paylas?: string }>
}) {
  const sp = await searchParams
  const [coupon, paylasilan] = await Promise.all([getCouponReminder(), paylasilaniGetir(sp.paylas)])
  return <CartPageClient coupon={coupon} paylasilan={paylasilan} />
}
