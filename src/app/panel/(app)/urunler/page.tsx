import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import UrunlerClient, { type UrunSatiri } from './UrunlerClient'

export const metadata: Metadata = { title: 'Ürünler' }
export const dynamic = 'force-dynamic'

const SAYFA_BOYU = 50

export default async function PanelUrunlerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const supabase = createServiceClient()

  const q = (sp.q || '').trim()

  /**
   * Durum DIŞINDAKİ tüm filtreler (Faz 23-C).
   *
   * İki yerde kullanılır: listenin kendisi ve sekme sayaçları. Sayaç aynı
   * filtre kümesiyle hesaplanmazsa "Kolye" seçiliyken sekmede 432 yazar ama
   * listede 130 satır çıkar — sayaç yalan söyler.
   */
  const filtrele = <T,>(qb: T): T => {
    let x = qb as any
    if (q.length >= 2) {
      const like = `%${q.replace(/[%_]/g, '')}%`
      x = x.or(
        `override_title.ilike.${like},trendyol_title.ilike.${like},trendyol_barcode.ilike.${like}`
      )
    }
    if (sp.kategori) x = x.eq('trendyol_category', sp.kategori)
    if (sp.gender === 'women' || sp.gender === 'men') x = x.eq('gender', sp.gender)
    else if (sp.gender === 'bos') x = x.is('gender', null)
    if (sp.stok === '1') x = x.eq('trendyol_stock', 1)
    else if (sp.stok === 'tukenen') x = x.eq('trendyol_stock', 0)
    if (sp.isaret === 'rozetli') x = x.not('badge', 'is', null)
    else if (sp.isaret === 'one-cikan') x = x.eq('is_featured', true)
    else if (sp.isaret === 'override') x = x.not('override_title', 'is', null)
    return x as T
  }

  // Varsayılan sekme AKTİF: panelde günlük iş aktif katalogda geçer, 88 pasif
  // satır aramayı ve toplu işlemleri kirletiyordu. "Tümü" artık açık bir
  // seçim (durum=tumu).
  const durum = sp.durum === 'pasif' || sp.durum === 'tumu' ? sp.durum : 'aktif'

  let query = filtrele(
    supabase
      .from('products')
      .select(
        'id, slug, override_title, trendyol_title, trendyol_barcode, trendyol_category, override_price, trendyol_price, trendyol_stock, is_active, badge, is_featured, gender, override_images, trendyol_images, updated_at',
        { count: 'exact' }
      )
  )
  if (durum === 'aktif') query = query.eq('is_active', true)
  else if (durum === 'pasif') query = query.eq('is_active', false)

  // Sıralama: ad için override_title (boşlar sona) + trendyol_title ikincil;
  // fiyat sync fiyatına göredir (override_price nadir, kolon coalesce basar).
  switch (sp.sira) {
    case 'ad':
      query = query
        .order('override_title', { ascending: true, nullsFirst: false })
        .order('trendyol_title', { ascending: true })
      break
    case 'fiyat':
      query = query.order('trendyol_price', { ascending: false })
      break
    case 'stok':
      query = query.order('trendyol_stock', { ascending: true })
      break
    default:
      query = query.order('updated_at', { ascending: false })
  }

  const sayfa = Math.max(1, parseInt(sp.sayfa || '1'))
  const from = (sayfa - 1) * SAYFA_BOYU
  const sayac = (aktif: boolean) =>
    filtrele(supabase.from('products').select('id', { count: 'exact', head: true })).eq(
      'is_active',
      aktif
    )

  const [{ data, count }, { count: aktifSayi }, { count: pasifSayi }] = await Promise.all([
    query.range(from, from + SAYFA_BOYU - 1),
    sayac(true),
    sayac(false),
  ])

  const satirlar: UrunSatiri[] = (data || []).map((p: any) => ({
    id: p.id,
    slug: p.slug,
    title: p.override_title || p.trendyol_title,
    tyTitle: p.trendyol_title,
    barcode: p.trendyol_barcode,
    category: p.trendyol_category,
    price: Number(p.override_price ?? p.trendyol_price ?? 0),
    stock: p.trendyol_stock ?? 0,
    active: Boolean(p.is_active),
    badge: p.badge || null,
    featured: Boolean(p.is_featured),
    hasOverride: Boolean(p.override_title),
    image:
      (p.override_images as string[] | null)?.[0] ??
      (p.trendyol_images as string[] | null)?.[0] ??
      null,
  }))

  // Filtre listesi için kategoriler
  const { data: kategoriData } = await supabase
    .from('products')
    .select('trendyol_category')
    .not('trendyol_category', 'is', null)
  const kategoriler = [...new Set((kategoriData || []).map((r: any) => r.trendyol_category))].sort(
    (a, b) => String(a).localeCompare(String(b), 'tr')
  )

  return (
    <UrunlerClient
      satirlar={satirlar}
      toplam={count ?? 0}
      sayfa={sayfa}
      sayfaBoyu={SAYFA_BOYU}
      kategoriler={kategoriler as string[]}
      aktifSayi={aktifSayi ?? 0}
      pasifSayi={pasifSayi ?? 0}
      params={{
        q,
        kategori: sp.kategori || '',
        gender: sp.gender || '',
        durum,
        stok: sp.stok || '',
        isaret: sp.isaret || '',
        sira: sp.sira || '',
      }}
    />
  )
}
